import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STORAGE_KEY = 'brava_clients';
function loadFromStorage() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveToStorage(clients) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); } catch {}
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [clientName, setClientName] = useState('');
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsMsgType, setSettingsMsgType] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [uploadedImageMime, setUploadedImageMime] = useState('image/jpeg');
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  // Conversa: lista de {role, content, timestamp}
  const [conversation, setConversation] = useState([]);
  // Última resposta da IA para exibir em destaque
  const [lastResponse, setLastResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    const t = localStorage.getItem('brava_theme') || 'dark';
    setTheme(t);
    setClients(loadFromStorage());
    return () => subscription.unsubscribe();
  }, []);

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('brava_theme', next);
  }

  function upsertClient(name, msgs, id) {
    const now = new Date().toISOString();
    const safe = msgs.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content
        : Array.isArray(m.content)
          ? m.content.map(b => b.type === 'text' ? b : { type: 'text', text: '[imagem enviada]' })
          : String(m.content),
      timestamp: m.timestamp || now,
    }));
    setClients(prev => {
      let updated;
      const idx = id ? prev.findIndex(c => c.id === id) : prev.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        updated = prev.map((c, i) => i === idx ? { ...c, messages: safe, updated_at: now } : c);
      } else {
        const nc = { id: Date.now().toString(), name, messages: safe, updated_at: now };
        setActiveClient(ac => ac ? { ...ac, id: nc.id } : ac);
        updated = [nc, ...prev];
      }
      updated = [...updated].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      saveToStorage(updated);
      return updated;
    });
  }

  function startNewClient() {
    if (!clientName.trim()) return;
    const ex = clients.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
    if (ex) { openClient(ex); return; }
    const now = new Date().toISOString();
    const nc = { id: Date.now().toString(), name: clientName.trim(), messages: [], updated_at: now };
    const updated = [nc, ...clients];
    setClients(updated);
    saveToStorage(updated);
    setActiveClient(nc);
    setConversation([]);
    setLastResponse('');
    setShowSidebar(false);
    setShowNewClientInput(false);
    setClientName('');
  }

  function openClient(client) {
    setActiveClient(client);
    const msgs = Array.isArray(client.messages) ? client.messages : [];
    setConversation(msgs);
    // Última resposta da IA
    const lastAI = [...msgs].reverse().find(m => m.role === 'assistant');
    setLastResponse(lastAI ? (typeof lastAI.content === 'string' ? lastAI.content : '') : '');
    setShowSidebar(false);
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const mime = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = ev => {
      setUploadedImage(file.name);
      setUploadedImageBase64(ev.target.result.split(',')[1]);
      setUploadedImageMime(mime);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendMessage() {
    if ((!message.trim() && !uploadedImageBase64) || isThinking) return;
    setIsThinking(true);
    setCopied(false);
    const now = new Date().toISOString();

    // Monta o conteúdo para a API (com imagem se houver)
    let apiContent;
    if (uploadedImageBase64) {
      apiContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: uploadedImageMime,
            data: uploadedImageBase64,
          },
        },
        {
          type: 'text',
          text: message.trim() || 'Analise esse print de conversa do cliente e sugira a melhor resposta para eu usar, de forma persuasiva e estratégica para fechar o negócio.',
        },
      ];
    } else {
      apiContent = message.trim();
    }

    const userMsg = {
      role: 'user',
      content: apiContent,
      timestamp: now,
    };

    const newConv = [...conversation, userMsg];
    setConversation(newConv);
    setMessage('');
    setUploadedImage(null);
    setUploadedImageBase64(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      // Monta histórico para API — converte msgs salvas (strings) para formato correto
      const apiMessages = newConv.map(m => ({
        role: m.role,
        content: m.content, // já está no formato correto (string ou array com image+text)
      }));

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `Você é um agente closer de vendas de alto nível da Brava Assessoria, especializado em fechar negócios imobiliários e de assessoria financeira. Está atendendo o cliente "${activeClient?.name}".

Quando receber prints de conversa (imagens do WhatsApp ou outro app), analise com cuidado o que o cliente escreveu e sugira uma resposta pronta, persuasiva e estratégica que o closer pode copiar e enviar diretamente ao cliente.

Quando receber texto descrevendo a situação, gere a melhor resposta ou estratégia de fechamento.

Seja direto, empático, persuasivo. Identifique objeções e as supere com inteligência consultiva. Responda sempre em português brasileiro.

IMPORTANTE: Forneça sempre uma resposta/sugestão pronta que o closer pode usar imediatamente.`,
          messages: apiMessages,
        }),
      });

      const data = await res.json();
      const aiText = data.content?.[0]?.text || 'Erro ao gerar resposta.';
      const assistantMsg = { role: 'assistant', content: aiText, timestamp: new Date().toISOString() };
      const finalConv = [...newConv, assistantMsg];
      setConversation(finalConv);
      setLastResponse(aiText);
      upsertClient(activeClient?.name, finalConv, activeClient?.id);
    } catch (err) {
      console.error(err);
      setLastResponse('Erro ao conectar com a IA. Verifique sua conexão.');
    }
    setIsThinking(false);
  }

  async function generateReport() {
    if (conversation.length === 0) return;
    setIsThinking(true); setShowReport(true); setReport('');
    try {
      const textConv = conversation.map(m => {
        const role = m.role === 'user' ? 'Closer' : 'Agente IA';
        const content = typeof m.content === 'string' ? m.content
          : Array.isArray(m.content) ? (m.content.find(b => b.type === 'text')?.text || '[imagem]') : '[conteúdo]';
        return `${role}: ${content}`;
      }).join('\n');
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: `Gere um relatório executivo profissional da negociação com "${activeClient?.name}" com:\n\n1. RESUMO DA NEGOCIAÇÃO\n2. NÍVEL DE INTERESSE (0-10 com justificativa)\n3. OBJEÇÕES IDENTIFICADAS\n4. PONTOS POSITIVOS\n5. PRÓXIMOS PASSOS RECOMENDADOS\n6. PROBABILIDADE DE FECHAMENTO (%)\n\nConversa:\n${textConv}` }],
        }),
      });
      const data = await res.json();
      setReport(data.content?.[0]?.text || 'Erro.');
    } catch (err) { console.error(err); }
    setIsThinking(false);
  }

  function copyResponse() {
    if (!lastResponse) return;
    navigator.clipboard.writeText(lastResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function newRound() {
    setMessage('');
    setUploadedImage(null);
    setUploadedImageBase64(null);
    setLastResponse('');
    setCopied(false);
  }

  async function handleSignOut() { await supabase.auth.signOut(); }

  async function updateProfile() {
    setSettingsMsg('');
    const updates = {};
    if (newName.trim()) updates.data = { full_name: newName.trim() };
    if (newEmail.trim()) updates.email = newEmail.trim();
    if (!Object.keys(updates).length) { setSettingsMsg('Nenhuma alteração.'); setSettingsMsgType('error'); return; }
    const { error } = await supabase.auth.updateUser(updates);
    if (error) { setSettingsMsg('Erro: ' + error.message); setSettingsMsgType('error'); return; }
    setSettingsMsg('Perfil atualizado!'); setSettingsMsgType('success');
    setNewName(''); setNewEmail('');
  }

  async function updatePassword() {
    setSettingsMsg('');
    if (!newPassword) { setSettingsMsg('Digite a nova senha.'); setSettingsMsgType('error'); return; }
    if (newPassword !== confirmPassword) { setSettingsMsg('Senhas não coincidem.'); setSettingsMsgType('error'); return; }
    if (newPassword.length < 6) { setSettingsMsg('Mínimo 6 caracteres.'); setSettingsMsgType('error'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setSettingsMsg('Erro: ' + error.message); setSettingsMsgType('error'); return; }
    setSettingsMsg('Senha atualizada!'); setSettingsMsgType('success');
    setNewPassword(''); setConfirmPassword('');
  }

  function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  function autoResize(e) { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#080810' }}>
      <img src="/logo.png" style={{ width:80, height:80, borderRadius:20, opacity:.9 }} alt="Brava" />
    </div>
  );

  if (!user) { if (typeof window !== 'undefined') window.location.href = '/login'; return null; }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Closer';

  const c = {
    bg: isDark ? '#080810' : '#f5f2ee',
    surface: isDark ? '#0f0f1a' : '#ffffff',
    surfaceAlt: isDark ? '#13131f' : '#f0ecf7',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#e8e0d5' : '#1a1410',
    textMuted: isDark ? 'rgba(232,224,213,0.45)' : 'rgba(26,20,16,0.45)',
    textFaint: isDark ? 'rgba(232,224,213,0.2)' : 'rgba(26,20,16,0.2)',
    purple: '#a855f7',
    purpleDark: '#7c3aed',
    purpleFade: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.07)',
    purpleBorder: 'rgba(168,85,247,0.3)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    headerBg: isDark ? 'rgba(8,8,16,0.96)' : 'rgba(245,242,238,0.96)',
  };

  return (
    <>
      <Head>
        <title>Brava Closer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${c.bg};font-family:'Jost',sans-serif;color:${c.text};overflow:hidden;height:100vh;transition:background .3s}
        ::placeholder{color:${c.textMuted};opacity:1}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(168,85,247,.2);border-radius:2px}
        textarea,input{outline:none;border:none;background:transparent;font-family:'Jost',sans-serif}
        button{cursor:pointer;font-family:'Jost',sans-serif;border:none}
        textarea{resize:none}

        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes modalUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:scale(.35);opacity:.35}40%{transform:scale(1);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

        /* Logo flutuante — mesmo efeito da tela de login */
        @keyframes logoFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.03)}}
        @keyframes logoGlow{
          0%,100%{box-shadow:0 0 30px rgba(168,85,247,.45),0 0 60px rgba(168,85,247,.2),0 20px 60px rgba(168,85,247,.25),0 4px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.15)}
          50%{box-shadow:0 0 50px rgba(168,85,247,.7),0 0 90px rgba(168,85,247,.35),0 25px 70px rgba(168,85,247,.4),0 4px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.2)}
        }
        /* Botão CTA flutuante */
        @keyframes btnFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes btnGlow{
          0%,100%{box-shadow:0 0 20px rgba(168,85,247,.4),0 8px 32px rgba(168,85,247,.25),0 2px 8px rgba(0,0,0,.4)}
          50%{box-shadow:0 0 35px rgba(168,85,247,.65),0 10px 44px rgba(168,85,247,.4),0 2px 8px rgba(0,0,0,.4)}
        }
        /* Botão copiar premium */
        @keyframes copyGlow{
          0%,100%{box-shadow:0 0 18px rgba(168,85,247,.35),0 6px 28px rgba(168,85,247,.2),inset 0 1px 0 rgba(255,255,255,.2)}
          50%{box-shadow:0 0 30px rgba(168,85,247,.6),0 8px 36px rgba(168,85,247,.35),inset 0 1px 0 rgba(255,255,255,.25)}
        }
        @keyframes d1{0%,80%,100%{transform:scale(.35);opacity:.35}40%{transform:scale(1);opacity:1}}

        .logo-float{animation:logoFloat 4s ease-in-out infinite,logoGlow 4s ease-in-out infinite}
        .btn-float{animation:btnFloat 3s ease-in-out infinite,btnGlow 3s ease-in-out infinite}
        .btn-copy{animation:copyGlow 3s ease-in-out infinite}
        .btn-copy:hover{filter:brightness(1.12);transform:scale(1.01)}
        .sb{animation:slideIn .25s cubic-bezier(.4,0,.2,1) forwards}
        .md{animation:modalUp .28s cubic-bezier(.4,0,.2,1) forwards}
        .resp{animation:fadeUp .35s ease forwards}
        .d1{animation:d1 1.4s -.32s infinite ease-in-out}
        .d2{animation:d1 1.4s -.16s infinite ease-in-out}
        .d3{animation:d1 1.4s 0s infinite ease-in-out}
        .ci:hover{background:${c.purpleFade} !important}
        .ib:hover{opacity:1 !important;color:${c.purple} !important}
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:c.bg, overflow:'hidden' }}>

        {/* ══ HEADER ══ */}
        <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:56, borderBottom:`1px solid ${c.border}`, background:c.headerBg, backdropFilter:'blur(20px)', flexShrink:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button className="ib" onClick={() => setShowSidebar(true)} style={{ background:'none', color:c.textMuted, padding:6, borderRadius:6, display:'flex', opacity:.65, transition:'all .2s' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <img src="/logo.png" style={{ width:29, height:29, borderRadius:7, objectFit:'cover', flexShrink:0, boxShadow:'0 0 10px rgba(168,85,247,.4)' }} alt="Brava" />
              <div style={{ display:'flex', alignItems:'baseline', gap:1 }}>
                <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontWeight:400, color:c.text, lineHeight:1 }}>Brava</span>
                <span style={{ fontFamily:'Jost,sans-serif', fontSize:9, fontWeight:600, letterSpacing:3, color:c.purple, textTransform:'uppercase', marginLeft:5 }}>CLOSER</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {activeClient && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:c.purpleFade, border:`1px solid ${c.purpleBorder}`, borderRadius:20 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:c.purple, boxShadow:`0 0 8px ${c.purple}` }} />
                <span style={{ fontSize:12, fontWeight:500, color:c.purple, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeClient.name}</span>
              </div>
            )}
            <button onClick={toggleTheme} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:c.inputBg, border:`1px solid ${c.border}`, borderRadius:20, color:c.textMuted, fontSize:11, fontWeight:500, letterSpacing:.4, transition:'all .2s' }}>
              {isDark
                ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>Claro</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Escuro</>}
            </button>
            <button className="ib" onClick={() => { setShowSettings(true); setSettingsMsg(''); }} style={{ background:'none', color:c.textMuted, padding:7, borderRadius:6, display:'flex', opacity:.6, transition:'all .2s' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button className="ib" onClick={handleSignOut} style={{ background:'none', color:c.textMuted, padding:7, borderRadius:6, display:'flex', opacity:.6, transition:'all .2s' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </header>

        {/* ══ SIDEBAR ══ */}
        {showSidebar && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', zIndex:100, display:'flex' }} onClick={() => setShowSidebar(false)}>
            <div className="sb" style={{ width:300, maxWidth:'88vw', background:c.surface, borderRight:`1px solid ${c.border}`, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>

              {/* User info */}
              <div style={{ padding:'28px 22px 20px', borderBottom:`1px solid ${c.border}`, background: isDark ? 'rgba(168,85,247,0.04)' : 'rgba(168,85,247,0.03)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,rgba(168,85,247,.6),rgba(168,85,247,.2))', border:`1.5px solid ${c.purpleBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:20, color:c.purple, boxShadow:'0 0 14px rgba(168,85,247,.3)' }}>
                    {userName[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:c.text }}>{userName}</div>
                    <div style={{ fontSize:11, color:c.textFaint, marginTop:2 }}>{user.email}</div>
                  </div>
                </div>
              </div>

              {/* Novo cliente */}
              <div style={{ padding:'20px 22px 0' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:c.purple, opacity:.7, marginBottom:12 }}>NOVO CLIENTE</div>
                {showNewClientInput ? (
                  <div style={{ display:'flex', gap:8 }}>
                    <input autoFocus style={{ flex:1, background:c.inputBg, border:`1px solid ${c.inputBorder}`, borderRadius:10, padding:'10px 13px', fontSize:13, color:c.text }} placeholder="Nome do cliente..." value={clientName} onChange={e => setClientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && startNewClient()} />
                    <button onClick={startNewClient} style={{ width:38, height:38, background:`linear-gradient(135deg,rgba(168,85,247,.8),rgba(110,30,190,.9))`, border:'none', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, boxShadow:'0 4px 14px rgba(168,85,247,.35)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewClientInput(true)} style={{ width:'100%', padding:'12px 14px', background:`linear-gradient(135deg,rgba(168,85,247,.12),rgba(168,85,247,.05))`, border:`1px dashed ${c.purpleBorder}`, borderRadius:10, color:c.purple, fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:8, boxShadow:'0 2px 10px rgba(168,85,247,.1)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Iniciar novo cliente
                  </button>
                )}
              </div>

              {/* Histórico */}
              <div style={{ flex:1, overflowY:'auto', padding:'20px 22px 24px' }}>
                {clients.length > 0 ? (
                  <>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:c.textMuted, marginBottom:10 }}>HISTÓRICO DE CLIENTES</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {clients.map(client => {
                        const msgCount = Array.isArray(client.messages) ? client.messages.length : 0;
                        const isAct = activeClient?.id === client.id;
                        return (
                          <button key={client.id} className="ci" onClick={() => openClient(client)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px', background: isAct ? `linear-gradient(135deg,rgba(168,85,247,.15),rgba(168,85,247,.05))` : 'none', border:`1px solid ${isAct ? c.purpleBorder : 'transparent'}`, borderRadius:10, textAlign:'left', width:'100%', transition:'all .15s' }}>
                            <div style={{ width:7, height:7, borderRadius:'50%', background: isAct ? c.purple : c.textFaint, flexShrink:0, boxShadow: isAct ? `0 0 8px ${c.purple}` : 'none' }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, color: isAct ? c.text : c.textMuted, fontWeight: isAct ? 600 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{client.name}</div>
                              <div style={{ fontSize:10, color:c.textFaint, marginTop:2 }}>{new Date(client.updated_at).toLocaleDateString('pt-BR')} · {msgCount} msgs</div>
                            </div>
                            {isAct && <div style={{ width:4, height:4, borderRadius:'50%', background:c.purple, flexShrink:0 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:'center', padding:'40px 0', color:c.textFaint, fontSize:12, lineHeight:1.8 }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>👥</div>
                    Nenhum cliente ainda<br/>Adicione seu primeiro cliente acima
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ MAIN ══ */}
        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* ── HOME ── */}
          {!activeClient ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px' }}>

              {/* Logo flutuante com iluminação — igual tela de login */}
              <div className="logo-float" style={{ marginBottom:32, borderRadius:28, overflow:'hidden' }}>
                <img src="/logo.png" style={{ width:120, height:120, borderRadius:28, objectFit:'cover', display:'block' }} alt="Brava" />
              </div>

              <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:34, fontWeight:300, color:c.text, letterSpacing:.5, marginBottom:8, textAlign:'center', lineHeight:1.2 }}>Closer Inteligente</h1>
              <p style={{ fontSize:13, color:c.textMuted, letterSpacing:.4, marginBottom:48, textAlign:'center', maxWidth:260, lineHeight:1.65 }}>Feche mais negócios com o poder da inteligência artificial</p>

              {/* Botão CTA flutuante premium */}
              <button className="btn-float" onClick={() => setShowSidebar(true)} style={{ padding:'16px 44px', background:'linear-gradient(135deg,rgba(168,85,247,.9),rgba(110,30,190,.95) 50%,rgba(168,85,247,.85))', border:'none', borderRadius:50, color:'#fff', fontSize:13, fontWeight:500, letterSpacing:2, textTransform:'uppercase', display:'flex', alignItems:'center', gap:10, position:'relative', overflow:'hidden', transition:'filter .2s' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,.22),transparent 55%)', borderRadius:50, pointerEvents:'none' }} />
                <div style={{ position:'absolute', inset:0, borderRadius:50, border:'1px solid rgba(255,255,255,.3)', pointerEvents:'none' }} />
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position:'relative' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span style={{ position:'relative' }}>Iniciar Conversa</span>
              </button>

              <div style={{ marginTop:40, display:'flex', gap:32 }}>
                {[['📊','Relatórios'], ['🤖','IA Closer'], ['💾','Histórico']].map(([icon, label]) => (
                  <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:22 }}>{icon}</span>
                    <span style={{ fontSize:10, color:c.textFaint, letterSpacing:.8 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            /* ── CONVERSA ── */
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

              {/* Sub-header da conversa */}
              <div style={{ padding:'0 20px', height:52, borderBottom:`1px solid ${c.border}`, background:c.headerBg, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <button
                  onClick={() => setShowSidebar(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:`linear-gradient(135deg,rgba(168,85,247,.12),rgba(168,85,247,.05))`, border:`1px solid ${c.purpleBorder}`, borderRadius:20, color:c.purple, fontSize:12, fontWeight:600, letterSpacing:.5, boxShadow:'0 2px 10px rgba(168,85,247,.15)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  Clientes
                </button>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:14, fontWeight:600, color:c.text }}>{activeClient.name}</div>
                  <div style={{ fontSize:10, color:c.textFaint }}>{conversation.length} interações</div>
                </div>
                <button onClick={generateReport} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', background:'linear-gradient(135deg,rgba(168,85,247,.7),rgba(110,30,190,.8))', border:'none', borderRadius:20, color:'#fff', fontSize:12, fontWeight:500, letterSpacing:.3, boxShadow:'0 2px 10px rgba(168,85,247,.3)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Relatório
                </button>
              </div>

              {/* Área scrollável */}
              <div style={{ flex:1, overflowY:'auto', padding:'24px 20px 20px', display:'flex', flexDirection:'column', gap:20 }}>

                {/* INPUT: Print + Texto */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                  {/* Card Print */}
                  <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:18, padding:'18px 18px 14px', boxShadow: isDark ? '0 2px 16px rgba(0,0,0,.3)' : '0 2px 12px rgba(0,0,0,.06)' }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:c.purple, marginBottom:12 }}>PRINT DA CONVERSA</div>
                    <button onClick={() => fileInputRef.current?.click()} style={{ width:'100%', padding:'22px 16px', background: uploadedImage ? c.purpleFade : c.inputBg, border:`2px dashed ${uploadedImage ? c.purple : c.border}`, borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', gap:7, color: uploadedImage ? c.purple : c.textMuted, transition:'all .2s' }}>
                      <span style={{ fontSize:26 }}>📱</span>
                      <span style={{ fontSize:13, fontWeight:500 }}>{uploadedImage || 'Toque para enviar o print'}</span>
                    </button>
                    {uploadedImage && (
                      <button onClick={() => { setUploadedImage(null); setUploadedImageBase64(null); }} style={{ marginTop:8, background:'none', color:c.textMuted, fontSize:12, width:'100%', textAlign:'center' }}>✕ Remover</button>
                    )}
                  </div>

                  {/* Card Texto */}
                  <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:18, padding:'18px 18px 14px', boxShadow: isDark ? '0 2px 16px rgba(0,0,0,.3)' : '0 2px 12px rgba(0,0,0,.06)' }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:c.textMuted, marginBottom:12 }}>OU DESCREVA A SITUAÇÃO</div>
                    <textarea ref={textareaRef} style={{ width:'100%', minHeight:80, fontSize:14, lineHeight:1.65, color:c.text, padding:'2px 0', background:'transparent' }} placeholder="Ex: Disse que está caro e vai pensar..." value={message} onChange={e => { setMessage(e.target.value); autoResize(e); }} onKeyDown={handleKeyDown} />
                  </div>

                  {/* Botão Gerar Resposta */}
                  <button onClick={sendMessage} disabled={(!message.trim() && !uploadedImageBase64) || isThinking}
                    style={{ padding:'16px', background: (!message.trim() && !uploadedImageBase64) ? c.inputBg : 'linear-gradient(135deg,rgba(168,85,247,.88),rgba(110,30,190,.95))', border:`1px solid ${(!message.trim() && !uploadedImageBase64) ? c.border : 'rgba(168,85,247,.4)'}`, borderRadius:16, color: (!message.trim() && !uploadedImageBase64) ? c.textMuted : '#fff', fontSize:14, fontWeight:500, letterSpacing:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s', position:'relative', overflow:'hidden', boxShadow: (!message.trim() && !uploadedImageBase64) ? 'none' : '0 4px 20px rgba(168,85,247,.4)' }}>
                    {(!message.trim() && !uploadedImageBase64) ? null : <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,.12),transparent 55%)', pointerEvents:'none' }} />}
                    {isThinking
                      ? <><div className="d1" style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,.7)', display:'inline-block' }} /><div className="d2" style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,.7)', display:'inline-block', margin:'0 4px' }} /><div className="d3" style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,.7)', display:'inline-block' }} /></>
                      : <><span style={{ position:'relative' }}>✦</span><span style={{ position:'relative' }}>Gerar resposta</span></>
                    }
                  </button>
                </div>

                {/* RESPOSTA PRONTA */}
                {lastResponse ? (
                  <div className="resp" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.purple} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:c.purple }}>RESPOSTA PRONTA</span>
                    </div>

                    {/* Card da resposta */}
                    <div style={{ background:c.surface, border:`1px solid ${c.purpleBorder}`, borderRadius:18, padding:'18px 18px 16px', boxShadow: isDark ? '0 4px 24px rgba(168,85,247,.15)' : '0 4px 16px rgba(168,85,247,.1)', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,rgba(168,85,247,.8),rgba(110,30,190,.6),rgba(168,85,247,.4))', borderRadius:'18px 18px 0 0' }} />
                      <div style={{ fontSize:14, lineHeight:1.75, color:c.text, whiteSpace:'pre-wrap' }}>
                        {lastResponse.split('\n').map((line, i, a) => <span key={i}>{line}{i < a.length-1 && <br/>}</span>)}
                      </div>
                    </div>

                    {/* Botões ação */}
                    <div style={{ display:'flex', gap:10 }}>
                      {/* Botão Copiar — premium 3D flutuante */}
                      <button className="btn-copy" onClick={copyResponse}
                        style={{ flex:1, padding:'14px 16px', background: copied ? 'linear-gradient(135deg,rgba(34,197,94,.8),rgba(22,163,74,.9))' : 'linear-gradient(135deg,rgba(168,85,247,.85),rgba(110,30,190,.95))', border:'none', borderRadius:14, color:'#fff', fontSize:13, fontWeight:600, letterSpacing:.8, display:'flex', alignItems:'center', justifyContent:'center', gap:8, position:'relative', overflow:'hidden', transition:'background .3s, filter .2s' }}>
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,.18),transparent 55%)', pointerEvents:'none' }} />
                        <div style={{ position:'absolute', inset:0, border:'1px solid rgba(255,255,255,.2)', borderRadius:14, pointerEvents:'none' }} />
                        <span style={{ position:'relative', fontSize:15 }}>{copied ? '✓' : '📋'}</span>
                        <span style={{ position:'relative' }}>{copied ? 'Copiado!' : 'Copiar Mensagem'}</span>
                      </button>
                      {/* Botão Nova */}
                      <button onClick={newRound}
                        style={{ padding:'14px 18px', background:c.surface, border:`1px solid ${c.border}`, borderRadius:14, color:c.textMuted, fontSize:13, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', flexShrink:0 }}>
                        Nova
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Histórico recente */}
                {conversation.length > 0 && (
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:c.textFaint, marginBottom:12 }}>HISTÓRICO RECENTE</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[...conversation].reverse().slice(0, 6).map((msg, i) => {
                        const isUser = msg.role === 'user';
                        const text = typeof msg.content === 'string' ? msg.content
                          : Array.isArray(msg.content) ? (msg.content.find(b => b.type === 'text')?.text || '[imagem]') : '[conteúdo]';
                        const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '';
                        return (
                          <div key={i} style={{ padding:'10px 13px', background:c.inputBg, border:`1px solid ${c.border}`, borderRadius:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, color: isUser ? c.textMuted : c.purple }}>{isUser ? 'CONTEXTO' : 'RESPOSTA'}</span>
                              <span style={{ fontSize:9, color:c.textFaint }}>{ts}</span>
                            </div>
                            <div style={{ fontSize:12, color:c.textMuted, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{text}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageUpload} />
            </div>
          )}
        </main>

        {/* ══ REPORT MODAL ══ */}
        {showReport && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setShowReport(false)}>
            <div className="md" style={{ width:'100%', maxWidth:560, maxHeight:'88vh', background:c.surface, borderRadius:'22px 22px 0 0', border:`1px solid ${c.border}`, borderBottom:'none', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 22px 16px', borderBottom:`1px solid ${c.border}` }}>
                <div>
                  <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontWeight:400, color:c.text }}>Relatório de Negociação</h2>
                  {activeClient && <p style={{ fontSize:11, color:c.textMuted, marginTop:3 }}>{activeClient.name} · {new Date().toLocaleDateString('pt-BR')}</p>}
                </div>
                <button onClick={() => setShowReport(false)} style={{ background:'none', color:c.textMuted, display:'flex', padding:4, borderRadius:6 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:22 }}>
                {isThinking && !report ? (
                  <div style={{ display:'flex', justifyContent:'center', gap:8, padding:48 }}>
                    <div className="d1" style={{ width:9, height:9, borderRadius:'50%', background:c.purple }} />
                    <div className="d2" style={{ width:9, height:9, borderRadius:'50%', background:c.purple }} />
                    <div className="d3" style={{ width:9, height:9, borderRadius:'50%', background:c.purple }} />
                  </div>
                ) : (
                  <div style={{ whiteSpace:'pre-wrap', fontSize:13.5, lineHeight:1.9, color:c.text }}>
                    {report.split('\n').map((line, i) => {
                      const isH = /^\d+\./.test(line.trim());
                      return <span key={i}>{isH ? <strong style={{ color:c.purple, fontFamily:'Cormorant Garamond,serif', fontSize:17, display:'block', marginTop: i > 0 ? 20 : 0, marginBottom:4 }}>{line}</strong> : line}{!isH && '\n'}</span>;
                    })}
                  </div>
                )}
              </div>
              {report && (
                <div style={{ padding:'14px 22px 24px', borderTop:`1px solid ${c.border}` }}>
                  <button onClick={() => navigator.clipboard.writeText(report)} style={{ width:'100%', padding:13, background:c.purpleFade, border:`1px solid ${c.purpleBorder}`, borderRadius:12, color:c.purple, fontSize:13, fontWeight:600, letterSpacing:.5 }}>
                    Copiar relatório
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ SETTINGS MODAL ══ */}
        {showSettings && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setShowSettings(false)}>
            <div className="md" style={{ width:'100%', maxWidth:520, maxHeight:'88vh', background:c.surface, borderRadius:'22px 22px 0 0', border:`1px solid ${c.border}`, borderBottom:'none', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 22px 16px', borderBottom:`1px solid ${c.border}` }}>
                <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontWeight:400, color:c.text }}>Configurações</h2>
                <button onClick={() => setShowSettings(false)} style={{ background:'none', color:c.textMuted, display:'flex', padding:4, borderRadius:6 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ display:'flex', padding:'0 22px', borderBottom:`1px solid ${c.border}` }}>
                {['profile','password'].map(tab => (
                  <button key={tab} onClick={() => { setSettingsTab(tab); setSettingsMsg(''); }} style={{ flex:1, padding:'12px 8px', background:'none', fontSize:12, fontWeight:500, letterSpacing:.5, color: settingsTab===tab ? c.purple : c.textMuted, borderBottom:`2px solid ${settingsTab===tab ? c.purple : 'transparent'}`, transition:'all .2s' }}>
                    {tab === 'profile' ? 'Perfil' : 'Senha'}
                  </button>
                ))}
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:22 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {settingsTab === 'profile' && (
                    <>
                      {[['Nome','text', userName, newName, setNewName],['E-mail','email', user.email, newEmail, setNewEmail]].map(([label,type,ph,val,set]) => (
                        <div key={label}>
                          <div style={{ fontSize:10, fontWeight:600, letterSpacing:2, color:c.textMuted, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
                          <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} style={{ width:'100%', background:c.inputBg, border:`1px solid ${c.inputBorder}`, borderRadius:10, padding:'12px 14px', fontSize:14, color:c.text }} />
                        </div>
                      ))}
                      <button onClick={updateProfile} style={{ padding:13, background:'linear-gradient(135deg,rgba(168,85,247,.8),rgba(110,30,190,.9))', border:'none', borderRadius:12, color:'#fff', fontSize:13, fontWeight:500, marginTop:4 }}>Salvar alterações</button>
                    </>
                  )}
                  {settingsTab === 'password' && (
                    <>
                      {[['Nova senha', newPassword, setNewPassword],['Confirmar senha', confirmPassword, setConfirmPassword]].map(([label,val,set]) => (
                        <div key={label}>
                          <div style={{ fontSize:10, fontWeight:600, letterSpacing:2, color:c.textMuted, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
                          <input type="password" placeholder="••••••••" value={val} onChange={e => set(e.target.value)} style={{ width:'100%', background:c.inputBg, border:`1px solid ${c.inputBorder}`, borderRadius:10, padding:'12px 14px', fontSize:14, color:c.text }} />
                        </div>
                      ))}
                      <button onClick={updatePassword} style={{ padding:13, background:'linear-gradient(135deg,rgba(168,85,247,.8),rgba(110,30,190,.9))', border:'none', borderRadius:12, color:'#fff', fontSize:13, fontWeight:500, marginTop:4 }}>Atualizar senha</button>
                    </>
                  )}
                  {settingsMsg && (
                    <div style={{ padding:'10px 14px', borderRadius:10, border:'1px solid', fontSize:13, background: settingsMsgType==='success' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', color: settingsMsgType==='success' ? '#4ade80' : '#f87171', borderColor: settingsMsgType==='success' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)' }}>
                      {settingsMsg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}