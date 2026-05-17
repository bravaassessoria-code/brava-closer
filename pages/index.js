import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const LOGO_B64 = 'data:image/png;base64,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';

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
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) loadClients(); }, [user]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('brava_theme', next);
  }

  async function loadClients() {
    const { data, error } = await supabase.from('clients').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (!error && data) setClients(data);
  }

  async function saveClientToSupabase(name, messages, clientId) {
    const now = new Date().toISOString();
    const safe = messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content
        : Array.isArray(m.content) ? m.content.map(b => b.type === 'text' ? b : { type: b.type, placeholder: '[imagem]' }) : m.content
    }));
    if (clientId) {
      await supabase.from('clients').update({ messages: JSON.stringify(safe), updated_at: now }).eq('id', clientId);
      loadClients();
    } else {
      const ex = clients.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (ex) {
        await supabase.from('clients').update({ messages: JSON.stringify(safe), updated_at: now }).eq('id', ex.id);
        loadClients();
      } else {
        const { data } = await supabase.from('clients').insert({ user_id: user.id, name, messages: JSON.stringify(safe), updated_at: now }).select();
        if (data?.[0]) setActiveClient(prev => ({ ...prev, id: data[0].id }));
        loadClients();
      }
    }
  }

  function startNewClient() {
    if (!clientName.trim()) return;
    const ex = clients.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
    if (ex) { loadClient(ex); return; }
    setActiveClient({ name: clientName.trim(), isNew: true, id: null });
    setConversation([]);
    setShowSidebar(false);
    setShowNewClientInput(false);
    setClientName('');
  }

  function loadClient(client) {
    setActiveClient(client);
    try { setConversation(JSON.parse(client.messages || '[]')); } catch { setConversation([]); }
    setShowSidebar(false);
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setUploadedImage(file.name); setUploadedImageBase64(ev.target.result.split(',')[1]); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendMessage() {
    if ((!message.trim() && !uploadedImageBase64) || isThinking) return;
    let userContent = uploadedImageBase64
      ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: uploadedImageBase64 } },
         { type: 'text', text: message.trim() || 'Analise esse print de conversa e me ajude a responder o cliente.' }]
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
          system: `Você é um agente closer de vendas de alto nível da Brava Assessoria, especializado em fechar negócios imobiliários e de assessoria financeira. Está atendendo o cliente "${activeClient?.name || clientName}". Quando receber prints ou transcrições, analise e sugira a melhor resposta estratégica. Seja direto, persuasivo, empático. Identifique objeções e as supere. Responda sempre em português brasileiro.`,
          messages: newConv.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.content?.[0]?.text || 'Erro ao gerar resposta.' };
      const finalConv = [...newConv, assistantMsg];
      setConversation(finalConv);
      await saveClientToSupabase(activeClient?.name || clientName, finalConv, activeClient?.id);
    } catch (err) { console.error(err); }
    setIsThinking(false);
  }

  async function generateReport() {
    if (conversation.length === 0) return;
    setIsThinking(true); setShowReport(true); setReport('');
    try {
      const textConv = conversation.map(m => {
        const role = m.role === 'user' ? 'Closer' : 'Agente IA';
        const content = typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.find(b => b.type === 'text')?.text || '[imagem]' : '[conteúdo]');
        return `${role}: ${content}`;
      }).join('\n');
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: `Gere um relatório executivo da conversa com "${activeClient?.name}" com:\n1. RESUMO\n2. NÍVEL DE INTERESSE (0-10)\n3. OBJEÇÕES\n4. PONTOS POSITIVOS\n5. PRÓXIMOS PASSOS\n6. PROBABILIDADE DE FECHAMENTO (%)\n\nConversa:\n${textConv}` }],
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
      <img src={LOGO_B64} style={{ width:80, height:80, borderRadius:20, opacity:0.9 }} />
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
        @keyframes glow { 0%,100%{box-shadow:0 0 24px rgba(168,85,247,.35),0 10px 40px rgba(168,85,247,.2),0 2px 8px rgba(0,0,0,.4)} 50%{box-shadow:0 0 40px rgba(168,85,247,.55),0 10px 50px rgba(168,85,247,.35),0 2px 8px rgba(0,0,0,.4)} }
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
            {/* LOGO COM CAMALEÃO */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <img src={LOGO_B64} style={{ width:28, height:28, borderRadius:7, objectFit:'cover', flexShrink:0 }} />
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
              {isDark ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>Claro</>
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
                        const msgCount = (() => { try { return JSON.parse(client.messages || '[]').length; } catch { return 0; } })();
                        const isActive = activeClient?.id === client.id;
                        return (
                          <button key={client.id} className="ci" onClick={() => loadClient(client)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background: isActive ? c.purpleFade : 'none', border:`1px solid ${isActive ? c.purpleBorder : 'transparent'}`, borderRadius:8, textAlign:'left', width:'100%', transition:'all .15s' }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background: isActive ? c.purple : c.textFaint, flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, color:c.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{client.name}</div>
                              <div style={{ fontSize:10, color:c.textFaint, marginTop:2 }}>{new Date(client.updated_at).toLocaleDateString('pt-BR')} · {msgCount} msgs</div>
                            </div>
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

          {/* HOME STATE */}
          {!activeClient ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>
              <div style={{ marginBottom:28, position:'relative' }}>
                <img src={LOGO_B64} style={{ width:110, height:110, borderRadius:26, objectFit:'cover', boxShadow:'0 0 0 1px rgba(168,85,247,.3), 0 20px 60px rgba(168,85,247,.28), 0 4px 20px rgba(0,0,0,.5)' }} />
              </div>
              <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:36, fontWeight:300, color:c.text, letterSpacing:.5, marginBottom:8, textAlign:'center', lineHeight:1.2 }}>Closer Inteligente</h1>
              <p style={{ fontSize:13, color:c.textMuted, letterSpacing:.4, marginBottom:44, textAlign:'center', maxWidth:280, lineHeight:1.6 }}>Feche mais negócios com o poder da inteligência artificial</p>
              <button className="fbtn" onClick={() => setShowSidebar(true)} style={{ padding:'15px 40px', background:'linear-gradient(135deg,rgba(168,85,247,.88) 0%,rgba(110,30,190,.95) 50%,rgba(168,85,247,.82) 100%)', border:'none', borderRadius:50, color:'#fff', fontSize:13, fontWeight:500, letterSpacing:2, textTransform:'uppercase', display:'flex', alignItems:'center', gap:10, position:'relative', overflow:'hidden', transition:'filter .2s' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,.22) 0%,transparent 55%)', borderRadius:50, pointerEvents:'none' }} />
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
            /* ══ CONVERSA: LAYOUT DA ARQUITETURA ══ */
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

              {/* Sub-header da conversa */}
              <div style={{ padding:'12px 16px 10px', borderBottom:`1px solid ${c.border}`, background:c.headerBg, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button onClick={() => setActiveClient(null)} style={{ background:'none', color:c.purple, fontSize:12, display:'flex', alignItems:'center', gap:4, fontWeight:500 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    Clientes
                  </button>
                  <div style={{ width:1, height:14, background:c.border }} />
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:c.text }}>{activeClient.name}</div>
                    <div style={{ fontSize:10, color:c.textFaint, marginTop:1 }}>
                      {conversation.length} interações
                    </div>
                  </div>
                </div>
                <button onClick={generateReport} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'linear-gradient(135deg,rgba(168,85,247,.7),rgba(110,30,190,.8))', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:500, letterSpacing:.3 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Relatório
                </button>
              </div>

              {/* Histórico de mensagens (quando há conversa) */}
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
                          {text?.split('\n').map((line, j, a) => <span key={j}>{line}{j < a.length-1 && <br/>}</span>)}
                        </div>
                        {isUser && <div style={{ width:28, height:28, borderRadius:'50%', background:c.inputBg, border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:c.textMuted, flexShrink:0 }}>{userName[0].toUpperCase()}</div>}
                      </div>
                    );
                  })}
                  {isThinking && !showReport && (
                    <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,rgba(168,85,247,.5),rgba(168,85,247,.15))', border:`1px solid ${c.purpleBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:c.purple, flexShrink:0 }}>A</div>
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

              {/* INPUT PRINCIPAL — layout da arquitetura quando não há mensagens */}
              {conversation.length === 0 ? (
                <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px 24px', gap:16, overflowY:'auto' }}>
                  {/* PRINT DA CONVERSA */}
                  <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:'18px 18px 14px', overflow:'hidden' }}>
                    <div style={{ fontSize:10, fontWeight:600, letterSpacing:2.5, color:c.purple, marginBottom:12 }}>PRINT DA CONVERSA</div>
                    <button onClick={() => fileInputRef.current?.click()} style={{ width:'100%', padding:'28px 20px', background: uploadedImage ? c.purpleFade : c.inputBg, border:`2px dashed ${uploadedImage ? c.purple : c.border}`, borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', gap:8, color: uploadedImage ? c.purple : c.textMuted, transition:'all .2s' }}>
                      <span style={{ fontSize:28 }}>📱</span>
                      <span style={{ fontSize:13, fontWeight:500 }}>{uploadedImage ? uploadedImage : 'Toque para enviar o print'}</span>
                    </button>
                    {uploadedImage && (
                      <button onClick={() => { setUploadedImage(null); setUploadedImageBase64(null); }} style={{ marginTop:8, background:'none', color:c.textMuted, fontSize:12, width:'100%', textAlign:'center' }}>✕ Remover</button>
                    )}
                  </div>

                  {/* OU DESCREVA A SITUAÇÃO */}
                  <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:'18px 18px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:600, letterSpacing:2.5, color:c.textMuted, marginBottom:12 }}>OU DESCREVA A SITUAÇÃO</div>
                    <textarea
                      ref={textareaRef}
                      style={{ width:'100%', minHeight:90, fontSize:14, lineHeight:1.6, color:c.text, padding:'4px 0', background:'transparent' }}
                      placeholder="Ex: Disse que está caro e vai pensar..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  {/* BOTÃO GERAR RESPOSTA */}
                  <button onClick={sendMessage} disabled={(!message.trim() && !uploadedImageBase64) || isThinking}
                    style={{ padding:'16px', background: (!message.trim() && !uploadedImageBase64) ? c.inputBg : 'linear-gradient(135deg,rgba(168,85,247,.85),rgba(110,30,190,.92))', border:`1px solid ${(!message.trim() && !uploadedImageBase64) ? c.border : c.purpleBorder}`, borderRadius:14, color: (!message.trim() && !uploadedImageBase64) ? c.textMuted : '#fff', fontSize:14, fontWeight:500, letterSpacing:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s' }}>
                    <span style={{ fontSize:14 }}>✦</span>
                    Gerar resposta
                  </button>

                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageUpload} />
                </div>

              ) : (
                /* INPUT COMPACTO quando já há mensagens */
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
                    <button onClick={sendMessage} disabled={(!message.trim() && !uploadedImageBase64) || isThinking} style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,rgba(168,85,247,.85),rgba(110,30,190,.92))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, opacity:(!message.trim() && !uploadedImageBase64) ? .32 : 1, transition:'all .2s', boxShadow: (!message.trim() && !uploadedImageBase64) ? 'none' : '0 2px 12px rgba(168,85,247,.35)' }}>
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