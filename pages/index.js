import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STORAGE_KEY = 'brava_clients';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
  const [conversation, setConversation] = useState([]);
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
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    const savedTheme = localStorage.getItem('brava_theme') || 'dark';
    setTheme(savedTheme);
    // Carrega clientes do localStorage imediatamente
    setClients(loadFromStorage());
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('brava_theme', next);
  }

  function upsertClient(name, messages, id) {
    const now = new Date().toISOString();
    // Serializa mensagens removendo dados binários grandes
    const safe = messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.map(b => b.type === 'text' ? b : { type: b.type, placeholder: '[imagem]' })
          : m.content
    }));

    setClients(prev => {
      let updated;
      const idx = id ? prev.findIndex(c => c.id === id) : prev.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        updated = prev.map((c, i) => i === idx ? { ...c, messages: safe, updated_at: now } : c);
      } else {
        const newClient = { id: Date.now().toString(), name, messages: safe, updated_at: now };
        updated = [newClient, ...prev];
        // Atualiza activeClient com o id gerado
        setActiveClient(ac => ac ? { ...ac, id: newClient.id } : ac);
      }
      // Ordena por mais recente
      updated = [...updated].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      saveToStorage(updated);
      return updated;
    });
  }

  function startNewClient() {
    if (!clientName.trim()) return;
    const ex = clients.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
    if (ex) { loadClient(ex); return; }
    const newId = Date.now().toString();
    const now = new Date().toISOString();
    const newClient = { id: newId, name: clientName.trim(), messages: [], updated_at: now };
    const updated = [newClient, ...clients];
    setClients(updated);
    saveToStorage(updated);
    setActiveClient(newClient);
    setConversation([]);
    setShowSidebar(false);
    setShowNewClientInput(false);
    setClientName('');
  }

  function loadClient(client) {
    setActiveClient(client);
    const msgs = Array.isArray(client.messages) ? client.messages : [];
    setConversation(msgs);
    setShowSidebar(false);
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setUploadedImage(file.name);
      setUploadedImageBase64(ev.target.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendMessage() {
    if ((!message.trim() && !uploadedImageBase64) || isThinking) return;

    let userContent = uploadedImageBase64
      ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: uploadedImageBase64 } },
         { type: 'text', text: message.trim() || 'Analise esse print de conversa e me ajude a responder o cliente de forma estratégica.' }]
      : message.trim();

    const userMsg = { role: 'user', content: userContent };
    const newConv = [...conversation, userMsg];
    setConversation(newConv);
    setMessage('');
    setUploadedImage(null);
    setUploadedImageBase64(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsThinking(true);

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `Você é um agente closer de vendas de alto nível da Brava Assessoria, especializado em fechar negócios imobiliários e de assessoria financeira. Está atendendo o cliente "${activeClient?.name || clientName}". Quando receber prints ou transcrições, analise e sugira a melhor resposta estratégica. Seja direto, persuasivo, empático. Identifique objeções e as supere com inteligência. Responda sempre em português brasileiro.`,
          messages: newConv.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.content?.[0]?.text || 'Erro ao gerar resposta.' };
      const finalConv = [...newConv, assistantMsg];
      setConversation(finalConv);
      upsertClient(activeClient?.name || clientName, finalConv, activeClient?.id);
    } catch (err) { console.error(err); }
    setIsThinking(false);
  }

  async function generateReport() {
    if (conversation.length === 0) return;
    setIsThinking(true); setShowReport(true); setReport('');
    try {
      const textConv = conversation.map(m => {
        const role = m.role === 'user' ? 'Closer' : 'Agente IA';
        const content = typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content) ? (m.content.find(b => b.type === 'text')?.text || '[imagem]') : '[conteúdo]';
        return `${role}: ${content}`;
      }).join('\n');

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: `Gere um relatório executivo profissional da conversa com "${activeClient?.name}" com:\n\n1. RESUMO DA NEGOCIAÇÃO\n2. NÍVEL DE INTERESSE (0-10 com justificativa)\n3. OBJEÇÕES IDENTIFICADAS\n4. PONTOS POSITIVOS\n5. PRÓXIMOS PASSOS RECOMENDADOS\n6. PROBABILIDADE DE FECHAMENTO (%)\n\nConversa:\n${textConv}` }],
        }),
      });
      const data = await res.json();
      setReport(data.content?.[0]?.text || 'Erro.');
    } catch (err) { console.error(err); }
    setIsThinking(false);
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
      <img src="/logo.png" style={{ width:80, height:80, borderRadius:20, opacity:.9 }} />
    </div>
  );

  if (!user) { if (typeof window !== 'undefined') window.location.href = '/login'; return null; }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Closer';

  const c = {
    bg: isDark ? '#080810' : '#f5f2ee',
    surface: isDark ? '#0f0f1a' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#e8e0d5' : '#1a1410',
    textMuted: isDark ? 'rgba(232,224,213,0.45)' : 'rgba(26,20,16,0.45)',
    textFaint: isDark ? 'rgba(232,224,213,0.2)' : 'rgba(26,20,16,0.2)',
    purple: '#a855f7',
    purpleFade: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.07)',
    purpleBorder: 'rgba(168,85,247,0.25)',
    bubbleUser: isDark ? 'rgba(168,85,247,0.13)' : 'rgba(168,85,247,0.09)',
    bubbleAgent: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    headerBg: isDark ? 'rgba(8,8,16,0.96)' : 'rgba(245,242,238,0.96)',
  };

  return (
    <>
      <Head>
        <title>Brava Closer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${c.bg}; font-family:'Jost',sans-serif; color:${c.text}; overflow:hidden; height:100vh; transition:background .3s; }
        ::placeholder { color:${c.textMuted}; opacity:1; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(168,85,247,.2); border-radius:2px; }
        textarea,input { outline:none; border:none; background:transparent; font-family:'Jost',sans-serif; }
        button { cursor:pointer; font-family:'Jost',sans-serif; border:none; }
        textarea { resize:none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes modalUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,80%,100%{transform:scale(.35);opacity:.35} 40%{transform:scale(1);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 24px rgba(168,85,247,.35),0 10px 40px rgba(168,85,247,.2)} 50%{box-shadow:0 0 40px rgba(168,85,247,.55),0 10px 50px rgba(168,85,247,.35)} }
        .msg{animation:fadeUp .28s ease forwards}
        .sb{animation:slideIn .25s cubic-bezier(.4,0,.2,1) forwards}
        .md{animation:modalUp .28s cubic-bezier(.4,0,.2,1) forwards}
        .d1{animation:bounce 1.4s -.32s infinite ease-in-out}
        .d2{animation:bounce 1.4s -.16s infinite ease-in-out}
        .d3{animation:bounce 1.4s 0s infinite ease-in-out}
        .fbtn{animation:float 3s ease-in-out infinite,glow 3s ease-in-out infinite}
        .fbtn:hover{filter:brightness(1.1)}
        .ci:hover{background:${c.purpleFade} !important}
        .ib:hover{opacity:1 !important;color:${c.purple} !important}
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:c.bg, overflow:'hidden' }}>

        {/* ══ HEADER ══ */}
        <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:56, borderBottom:`1px solid ${c.border}`, background:c.headerBg, backdropFilter:'blur(20px)', flexShrink:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="ib" onClick={() => setShowSidebar(true)} style={{ background:'none', color:c.textMuted, padding:6, borderRadius:6, display:'flex', opacity:.65, transition:'all .2s' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <img src="/logo.png" style={{ width:28, height:28, borderRadius:7, objectFit:'cover', flexShrink:0 }} />
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
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Escuro</>
              }
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
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(6px)', zIndex:100, display:'flex' }} onClick={() => setShowSidebar(false)}>
            <div className="sb" style={{ width:290, maxWidth:'85vw', background:c.surface, borderRight:`1px solid ${c.border}`, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>

              <div style={{ padding:'24px 20px 20px', borderBottom:`1px solid ${c.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,rgba(168,85,247,.55),rgba(168,85,247,.15))', border:`1px solid ${c.purpleBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontSize:18, color:c.purple }}>
                    {userName[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:c.text }}>{userName}</div>
                    <div style={{ fontSize:11, color:c.textFaint, marginTop:2 }}>{user.email}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding:'18px 20px 0' }}>
                <div style={{ fontSize:9, fontWeight:600, letterSpacing:2.5, color:c.purple, opacity:.6, marginBottom:10 }}>NOVO CLIENTE</div>
                {showNewClientInput ? (
                  <div style={{ display:'flex', gap:8 }}>
                    <input autoFocus style={{ flex:1, background:c.inputBg, border:`1px solid ${c.inputBorder}`, borderRadius:8, padding:'9px 12px', fontSize:13, color:c.text }} placeholder="Nome do cliente..." value={clientName} onChange={e => setClientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && startNewClient()} />
                    <button onClick={startNewClient} style={{ width:36, height:36, background:c.purpleFade, border:`1px solid ${c.purpleBorder}`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:c.purple, flexShrink:0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewClientInput(true)} style={{ width:'100%', padding:'10px 14px', background:c.purpleFade, border:`1px dashed ${c.purpleBorder}`, borderRadius:8, color:c.purple, fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Novo cliente
                  </button>
                )}
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 20px' }}>
                {clients.length > 0 ? (
                  <>
                    <div style={{ fontSize:9, fontWeight:600, letterSpacing:2.5, color:c.textMuted, marginBottom:8 }}>HISTÓRICO</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {clients.map(client => {
                        const msgCount = Array.isArray(client.messages) ? client.messages.length : 0;
                        const isActive = activeClient?.id === client.id;
                        return (
                          <button key={client.id} className="ci" onClick={() => loadClient(client)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background: isActive ? c.purpleFade : 'none', border:`1px solid ${isActive ? c.purpleBorder : 'transparent'}`, borderRadius:8, textAlign:'left', width:'100%', transition:'all .15s' }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background: isActive ? c.purple : c.textFaint, flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, color:c.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{client.name}</div>
                              <div style={{ fontSize:10, color:c.textFaint, marginTop:2 }}>
                                {new Date(client.updated_at).toLocaleDateString('pt-BR')} · {msgCount} msgs
                              </div>
                            </div>
                            {isActive && <div style={{ width:4, height:4, borderRadius:'50%', background:c.purple, flexShrink:0 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:'center', padding:'30px 0', color:c.textFaint, fontSize:12 }}>Nenhum cliente ainda</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ MAIN ══ */}
        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* HOME */}
          {!activeClient ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>
              <div style={{ marginBottom:28 }}>
                <img src="/logo.png" style={{ width:110, height:110, borderRadius:26, objectFit:'cover', boxShadow:'0 0 0 1px rgba(168,85,247,.3), 0 20px 60px rgba(168,85,247,.28), 0 4px 20px rgba(0,0,0,.5)' }} />
              </div>
              <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:36, fontWeight:300, color:c.text, letterSpacing:.5, marginBottom:8, textAlign:'center' }}>Closer Inteligente</h1>
              <p style={{ fontSize:13, color:c.textMuted, letterSpacing:.4, marginBottom:44, textAlign:'center', maxWidth:280, lineHeight:1.6 }}>Feche mais negócios com o poder da inteligência artificial</p>
              <button className="fbtn" onClick={() => setShowSidebar(true)} style={{ padding:'15px 40px', background:'linear-gradient(135deg,rgba(168,85,247,.88),rgba(110,30,190,.95) 50%,rgba(168,85,247,.82))', border:'none', borderRadius:50, color:'#fff', fontSize:13, fontWeight:500, letterSpacing:2, textTransform:'uppercase', display:'flex', alignItems:'center', gap:10, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,.22),transparent 55%)', borderRadius:50, pointerEvents:'none' }} />
                <div style={{ position:'absolute', inset:0, borderRadius:50, border:'1px solid rgba(255,255,255,.28)', pointerEvents:'none' }} />
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position:'relative' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span style={{ position:'relative' }}>Iniciar Conversa</span>
              </button>
              <div style={{ marginTop:36, display:'flex', gap:28 }}>
                {[['📊','Relatórios'], ['🤖','IA Closer'], ['💾','Histórico']].map(([icon, label]) => (
                  <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:20 }}>{icon}</span>
                    <span style={{ fontSize:10, color:c.textFaint, letterSpacing:.8 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

              {/* Sub-header */}
              <div style={{ padding:'12px 16px 10px', borderBottom:`1px solid ${c.border}`, background:c.headerBg, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button onClick={() => { setActiveClient(null); setConversation([]); }} style={{ background:'none', color:c.purple, fontSize:12, display:'flex', alignItems:'center', gap:4, fontWeight:500 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    Clientes
                  </button>
                  <div style={{ width:1, height:14, background:c.border }} />
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:c.text }}>{activeClient.name}</div>
                    <div style={{ fontSize:10, color:c.textFaint, marginTop:1 }}>{conversation.length} interações</div>
                  </div>
                </div>
                <button onClick={generateReport} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'linear-gradient(135deg,rgba(168,85,247,.7),rgba(110,30,190,.8))', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:500, letterSpacing:.3 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Relatório
                </button>
              </div>

              {/* Mensagens */}
              {conversation.length > 0 && (
                <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
                  {conversation.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const isArr = Array.isArray(msg.content);
                    const text = isArr ? msg.content.find(b => b.type === 'text')?.text : msg.content;
                    const hasImg = isArr && msg.content.some(b => b.type === 'image');
                    return (
                      <div key={i} className="msg" style={{ display:'flex', alignItems:'flex-end', gap:8, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                        {!isUser && <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,rgba(168,85,247,.5),rgba(168,85,247,.15))', border:`1px solid ${c.purpleBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:c.purple, flexShrink:0 }}>A</div>}
                        <div style={{ maxWidth:'76%', padding:'10px 14px', borderRadius:16, fontSize:14, lineHeight:1.65, background: isUser ? c.bubbleUser : c.bubbleAgent, border:`1px solid ${isUser ? c.purpleBorder : c.border}`, color:c.text, borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4 }}>
                          {hasImg && <div style={{ marginBottom:5, fontSize:11, color:c.purple, display:'flex', alignItems:'center', gap:4 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Print enviado</div>}
                          {(text || '').split('\n').map((line, j, a) => <span key={j}>{line}{j < a.length-1 && <br/>}</span>)}
                        </div>
                        {isUser && <div style={{ width:28, height:28, borderRadius:'50%', background:c.inputBg, border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:c.textMuted, flexShrink:0 }}>{userName[0].toUpperCase()}</div>}
                      </div>
                    );
                  })}
                  {isThinking && !showReport && (
                    <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,rgba(168,85,247,.5),rgba(168,85,247,.15))', border:`1px solid ${c.purpleBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:c.purple, flexShrink:0 }}>A</div>
                      <div style={{ display:'flex', gap:5, alignItems:'center', padding:'12px 16px', background:c.bubbleAgent, border:`1px solid ${c.border}`, borderRadius:16, borderBottomLeftRadius:4 }}>
                        <div className="d1" style={{ width:7, height:7, borderRadius:'50%', background:c.purple }} />
                        <div className="d2" style={{ width:7, height:7, borderRadius:'50%', background:c.purple }} />
                        <div className="d3" style={{ width:7, height:7, borderRadius:'50%', background:c.purple }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* INPUT — layout arquitetura quando sem mensagens */}
              {conversation.length === 0 ? (
                <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px 24px', gap:16, overflowY:'auto' }}>
                  <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:'18px 18px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:600, letterSpacing:2.5, color:c.purple, marginBottom:12 }}>PRINT DA CONVERSA</div>
                    <button onClick={() => fileInputRef.current?.click()} style={{ width:'100%', padding:'28px 20px', background: uploadedImage ? c.purpleFade : c.inputBg, border:`2px dashed ${uploadedImage ? c.purple : c.border}`, borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', gap:8, color: uploadedImage ? c.purple : c.textMuted, transition:'all .2s' }}>
                      <span style={{ fontSize:28 }}>📱</span>
                      <span style={{ fontSize:13, fontWeight:500 }}>{uploadedImage || 'Toque para enviar o print'}</span>
                    </button>
                    {uploadedImage && (
                      <button onClick={() => { setUploadedImage(null); setUploadedImageBase64(null); }} style={{ marginTop:8, background:'none', color:c.textMuted, fontSize:12, width:'100%', textAlign:'center' }}>✕ Remover</button>
                    )}
                  </div>

                  <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:'18px 18px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:600, letterSpacing:2.5, color:c.textMuted, marginBottom:12 }}>OU DESCREVA A SITUAÇÃO</div>
                    <textarea style={{ width:'100%', minHeight:90, fontSize:14, lineHeight:1.6, color:c.text, padding:'4px 0', background:'transparent' }} placeholder="Ex: Disse que está caro e vai pensar..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} />
                  </div>

                  <button onClick={sendMessage} disabled={(!message.trim() && !uploadedImageBase64) || isThinking}
                    style={{ padding:'16px', background: (!message.trim() && !uploadedImageBase64) ? c.inputBg : 'linear-gradient(135deg,rgba(168,85,247,.85),rgba(110,30,190,.92))', border:`1px solid ${(!message.trim() && !uploadedImageBase64) ? c.border : c.purpleBorder}`, borderRadius:14, color: (!message.trim() && !uploadedImageBase64) ? c.textMuted : '#fff', fontSize:14, fontWeight:500, letterSpacing:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s' }}>
                    <span>✦</span> Gerar resposta
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageUpload} />
                </div>

              ) : (
                /* Input compacto quando já há mensagens */
                <div style={{ padding:'10px 16px 18px', borderTop:`1px solid ${c.border}`, background:c.headerBg, flexShrink:0 }}>
                  <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:5, background: uploadedImage ? c.purpleFade : 'none', border:`1px solid ${uploadedImage ? c.purpleBorder : c.border}`, borderRadius:6, padding:'5px 10px', fontSize:11, color: uploadedImage ? c.purple : c.textMuted, letterSpacing:.3, transition:'all .2s', maxWidth:160 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{uploadedImage ? uploadedImage.slice(0,16)+'…' : 'Enviar print'}</span>
                    </button>
                    {uploadedImage && <button onClick={() => { setUploadedImage(null); setUploadedImageBase64(null); }} style={{ background:'none', color:c.textMuted, fontSize:14, padding:'0 4px' }}>✕</button>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageUpload} />
                  <div style={{ display:'flex', alignItems:'flex-end', gap:8, background:c.inputBg, border:`1px solid ${c.inputBorder}`, borderRadius:14, padding:'8px 8px 8px 14px' }}>
                    <textarea ref={textareaRef} style={{ flex:1, fontSize:14, lineHeight:1.5, color:c.text, maxHeight:120, overflowY:'auto', padding:'2px 0' }} placeholder="Descreva a situação ou escreva o que o cliente falou..." value={message} onChange={e => { setMessage(e.target.value); autoResize(e); }} onKeyDown={handleKeyDown} rows={1} />
                    <button onClick={sendMessage} disabled={(!message.trim() && !uploadedImageBase64) || isThinking} style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,rgba(168,85,247,.85),rgba(110,30,190,.92))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, opacity:(!message.trim() && !uploadedImageBase64) ? .32 : 1, transition:'all .2s' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                  <div style={{ fontSize:10, color:c.textFaint, textAlign:'center', marginTop:7 }}>Enter para enviar · Shift+Enter nova linha</div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ══ REPORT MODAL ══ */}
        {showReport && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setShowReport(false)}>
            <div className="md" style={{ width:'100%', maxWidth:560, maxHeight:'88vh', background:c.surface, borderRadius:'20px 20px 0 0', border:`1px solid ${c.border}`, borderBottom:'none', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 16px', borderBottom:`1px solid ${c.border}` }}>
                <div>
                  <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontWeight:400, color:c.text }}>Relatório de Negociação</h2>
                  {activeClient && <p style={{ fontSize:11, color:c.textMuted, marginTop:3 }}>{activeClient.name} · {new Date().toLocaleDateString('pt-BR')}</p>}
                </div>
                <button onClick={() => setShowReport(false)} style={{ background:'none', color:c.textMuted, display:'flex', padding:4, borderRadius:6 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                {isThinking && !report ? (
                  <div style={{ display:'flex', justifyContent:'center', gap:8, padding:40 }}>
                    <div className="d1" style={{ width:8, height:8, borderRadius:'50%', background:c.purple }} />
                    <div className="d2" style={{ width:8, height:8, borderRadius:'50%', background:c.purple }} />
                    <div className="d3" style={{ width:8, height:8, borderRadius:'50%', background:c.purple }} />
                  </div>
                ) : (
                  <div style={{ whiteSpace:'pre-wrap', fontSize:13.5, lineHeight:1.85, color:c.text }}>
                    {report.split('\n').map((line, i) => {
                      const isH = /^\d+\./.test(line.trim());
                      return <span key={i}>{isH ? <strong style={{ color:c.purple, fontFamily:'Cormorant Garamond,serif', fontSize:17, display:'block', marginTop: i > 0 ? 18 : 0, marginBottom:4 }}>{line}</strong> : line}{!isH && '\n'}</span>;
                    })}
                  </div>
                )}
              </div>
              {report && (
                <div style={{ padding:'12px 20px 20px', borderTop:`1px solid ${c.border}` }}>
                  <button onClick={() => navigator.clipboard.writeText(report)} style={{ width:'100%', padding:12, background:c.purpleFade, border:`1px solid ${c.purpleBorder}`, borderRadius:10, color:c.purple, fontSize:13, fontWeight:500, letterSpacing:.5 }}>
                    Copiar relatório
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ SETTINGS MODAL ══ */}
        {showSettings && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setShowSettings(false)}>
            <div className="md" style={{ width:'100%', maxWidth:520, maxHeight:'88vh', background:c.surface, borderRadius:'20px 20px 0 0', border:`1px solid ${c.border}`, borderBottom:'none', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 16px', borderBottom:`1px solid ${c.border}` }}>
                <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontWeight:400, color:c.text }}>Configurações</h2>
                <button onClick={() => setShowSettings(false)} style={{ background:'none', color:c.textMuted, display:'flex', padding:4, borderRadius:6 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ display:'flex', padding:'0 20px', borderBottom:`1px solid ${c.border}` }}>
                {['profile','password'].map(tab => (
                  <button key={tab} onClick={() => { setSettingsTab(tab); setSettingsMsg(''); }} style={{ flex:1, padding:'11px 8px', background:'none', fontSize:12, fontWeight:500, letterSpacing:.5, color: settingsTab===tab ? c.purple : c.textMuted, borderBottom:`2px solid ${settingsTab===tab ? c.purple : 'transparent'}`, transition:'all .2s' }}>
                    {tab === 'profile' ? 'Perfil' : 'Senha'}
                  </button>
                ))}
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {settingsTab === 'profile' && (
                    <>
                      {[['Nome','text', userName, newName, setNewName],['E-mail','email', user.email, newEmail, setNewEmail]].map(([label,type,ph,val,set]) => (
                        <div key={label}>
                          <div style={{ fontSize:10, fontWeight:600, letterSpacing:2, color:c.textMuted, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
                          <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} style={{ width:'100%', background:c.inputBg, border:`1px solid ${c.inputBorder}`, borderRadius:8, padding:'11px 14px', fontSize:14, color:c.text }} />
                        </div>
                      ))}
                      <button onClick={updateProfile} style={{ padding:12, background:'linear-gradient(135deg,rgba(168,85,247,.8),rgba(110,30,190,.9))', border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:500, marginTop:4 }}>Salvar alterações</button>
                    </>
                  )}
                  {settingsTab === 'password' && (
                    <>
                      {[['Nova senha', newPassword, setNewPassword],['Confirmar senha', confirmPassword, setConfirmPassword]].map(([label,val,set]) => (
                        <div key={label}>
                          <div style={{ fontSize:10, fontWeight:600, letterSpacing:2, color:c.textMuted, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
                          <input type="password" placeholder="••••••••" value={val} onChange={e => set(e.target.value)} style={{ width:'100%', background:c.inputBg, border:`1px solid ${c.inputBorder}`, borderRadius:8, padding:'11px 14px', fontSize:14, color:c.text }} />
                        </div>
                      ))}
                      <button onClick={updatePassword} style={{ padding:12, background:'linear-gradient(135deg,rgba(168,85,247,.8),rgba(110,30,190,.9))', border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:500, marginTop:4 }}>Atualizar senha</button>
                    </>
                  )}
                  {settingsMsg && (
                    <div style={{ padding:'10px 14px', borderRadius:8, border:'1px solid', fontSize:13, background: settingsMsgType==='success' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', color: settingsMsgType==='success' ? '#4ade80' : '#f87171', borderColor: settingsMsgType==='success' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)' }}>
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