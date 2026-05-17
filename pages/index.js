import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    checkBiometric();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadClients();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  async function checkBiometric() {
    if (window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setBiometricAvailable(available);
    }
  }

  async function loadClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (!error && data) setClients(data);
  }

  async function saveClientToSupabase(name, messages) {
    const existing = clients.find(c => c.name === name);
    if (existing) {
      const { error } = await supabase
        .from('clients')
        .update({ messages: JSON.stringify(messages), updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (!error) loadClients();
    } else {
      const { error } = await supabase
        .from('clients')
        .insert({ user_id: user.id, name, messages: JSON.stringify(messages), updated_at: new Date().toISOString() });
      if (!error) loadClients();
    }
  }

  function startNewClient() {
    if (!clientName.trim()) return;
    const existing = clients.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
    if (existing) {
      loadClient(existing);
      return;
    }
    setActiveClient({ name: clientName.trim(), isNew: true });
    setConversation([]);
    setShowSidebar(false);
  }

  function loadClient(client) {
    setActiveClient(client);
    try {
      setConversation(JSON.parse(client.messages || '[]'));
    } catch {
      setConversation([]);
    }
    setClientName(client.name);
    setShowSidebar(false);
  }

  async function sendMessage() {
    if (!message.trim() || isThinking) return;
    const userMsg = { role: 'user', content: message.trim() };
    const newConv = [...conversation, userMsg];
    setConversation(newConv);
    setMessage('');
    setIsThinking(true);

    try {
      const systemPrompt = `Você é um agente closer de vendas de alto nível da Brava Assessoria, especializado em fechar negócios imobiliários e de assessoria financeira. 
      Você está atendendo o cliente "${activeClient?.name || clientName}".
      Seja direto, persuasivo, empático e profissional. Use técnicas de fechamento consultivo.
      Identifique objeções e as supere com inteligência. Sempre conduza a conversa em direção ao fechamento.
      Responda sempre em português brasileiro.`;

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: newConv,
        }),
      });
      const data = await res.json();
      const assistantMsg = {
        role: 'assistant',
        content: data.content?.[0]?.text || 'Erro ao gerar resposta.',
      };
      const finalConv = [...newConv, assistantMsg];
      setConversation(finalConv);
      await saveClientToSupabase(activeClient?.name || clientName, finalConv);
    } catch (err) {
      console.error(err);
    }
    setIsThinking(false);
  }

  async function generateReport() {
    if (conversation.length === 0) return;
    setIsThinking(true);
    setShowReport(true);
    setReport('');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: `Com base na conversa abaixo com o cliente "${activeClient?.name || clientName}", gere um relatório executivo de negociação com:
              
              1. RESUMO DA NEGOCIAÇÃO
              2. NÍVEL DE INTERESSE DO CLIENTE (0-10)
              3. OBJEÇÕES IDENTIFICADAS
              4. PONTOS POSITIVOS
              5. PRÓXIMOS PASSOS RECOMENDADOS
              6. PROBABILIDADE DE FECHAMENTO
              
              Conversa:
              ${conversation.map(m => `${m.role === 'user' ? 'Closer' : 'Agente'}: ${m.content}`).join('\n')}`,
            },
          ],
        }),
      });
      const data = await res.json();
      setReport(data.content?.[0]?.text || 'Erro ao gerar relatório.');
    } catch (err) {
      console.error(err);
    }
    setIsThinking(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function updateProfile() {
    setSettingsMsg('');
    if (newName.trim()) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: newName.trim() } });
      if (error) { setSettingsMsg('Erro ao atualizar nome.'); setSettingsMsgType('error'); return; }
    }
    if (newEmail.trim()) {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) { setSettingsMsg('Erro ao atualizar e-mail.'); setSettingsMsgType('error'); return; }
    }
    setSettingsMsg('Perfil atualizado com sucesso!');
    setSettingsMsgType('success');
    setNewName('');
    setNewEmail('');
  }

  async function updatePassword() {
    setSettingsMsg('');
    if (!newPassword) { setSettingsMsg('Digite a nova senha.'); setSettingsMsgType('error'); return; }
    if (newPassword !== confirmPassword) { setSettingsMsg('As senhas não coincidem.'); setSettingsMsgType('error'); return; }
    if (newPassword.length < 6) { setSettingsMsg('Senha deve ter mínimo 6 caracteres.'); setSettingsMsgType('error'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setSettingsMsg('Erro ao atualizar senha.'); setSettingsMsgType('error'); return; }
    setSettingsMsg('Senha atualizada com sucesso!');
    setSettingsMsgType('success');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleBiometricSetup() {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'Brava Closer', id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: user?.email || 'user',
            displayName: user?.user_metadata?.full_name || user?.email || 'Usuário',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      if (credential) {
        localStorage.setItem('brava_biometric_id', credential.id);
        setSettingsMsg('Biometria configurada com sucesso!');
        setSettingsMsgType('success');
      }
    } catch (err) {
      setSettingsMsg('Erro ao configurar biometria: ' + err.message);
      setSettingsMsgType('error');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize(e) {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingLogo}>B</div>
        <div style={styles.loadingDots}>
          <span /><span /><span />
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Closer';

  return (
    <>
      <Head>
        <title>Brava Closer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; font-family: 'Jost', sans-serif; color: #e8e0d5; overflow: hidden; height: 100vh; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 2px; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dotBounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
        
        .msg-bubble { animation: fadeIn 0.3s ease forwards; }
        .thinking-dot { animation: dotBounce 1.4s infinite ease-in-out both; }
        .thinking-dot:nth-child(1) { animation-delay: -0.32s; }
        .thinking-dot:nth-child(2) { animation-delay: -0.16s; }
        .sidebar-open { animation: slideIn 0.25s ease forwards; }
        .modal-open { animation: modalIn 0.25s ease forwards; }
        
        textarea { resize: none; outline: none; border: none; background: transparent; font-family: 'Jost', sans-serif; }
        input { outline: none; font-family: 'Jost', sans-serif; }
        button { cursor: pointer; font-family: 'Jost', sans-serif; }
        
        @media (max-width: 600px) {
          .desktop-only { display: none !important; }
        }
      `}</style>

      <div style={styles.app}>

        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.menuBtn} onClick={() => setShowSidebar(!showSidebar)} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={styles.logo}>
              <span style={styles.logoB}>B</span>
              <span style={styles.logoText}>rava</span>
              <span style={styles.logoDivider}>·</span>
              <span style={styles.logoCloser}>Closer</span>
            </div>
          </div>

          <div style={styles.headerRight}>
            {activeClient && (
              <div style={styles.activeClientBadge}>
                <div style={styles.activeDot} />
                <span style={styles.activeClientName}>{activeClient.name}</span>
              </div>
            )}
            <button style={styles.iconBtn} onClick={() => { setShowSettings(true); setSettingsMsg(''); }} aria-label="Configurações">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <button style={styles.iconBtn} onClick={handleSignOut} aria-label="Sair">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </header>

        {/* SIDEBAR */}
        {showSidebar && (
          <div style={styles.sidebarOverlay} onClick={() => setShowSidebar(false)}>
            <div style={styles.sidebar} className="sidebar-open" onClick={e => e.stopPropagation()}>
              <div style={styles.sidebarHeader}>
                <div style={styles.sidebarUserInfo}>
                  <div style={styles.avatarCircle}>{userName[0].toUpperCase()}</div>
                  <div>
                    <div style={styles.sidebarUserName}>{userName}</div>
                    <div style={styles.sidebarUserEmail}>{user.email}</div>
                  </div>
                </div>
              </div>

              <div style={styles.sidebarSection}>
                <div style={styles.sidebarSectionTitle}>NOVO CLIENTE</div>
                <div style={styles.newClientRow}>
                  <input
                    style={styles.sidebarInput}
                    placeholder="Nome do cliente..."
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startNewClient()}
                  />
                  <button style={styles.addBtn} onClick={startNewClient}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>

              {clients.length > 0 && (
                <div style={styles.sidebarSection}>
                  <div style={styles.sidebarSectionTitle}>HISTÓRICO</div>
                  <div style={styles.clientList}>
                    {clients.map(client => (
                      <button
                        key={client.id}
                        style={{
                          ...styles.clientItem,
                          ...(activeClient?.id === client.id ? styles.clientItemActive : {}),
                        }}
                        onClick={() => loadClient(client)}
                      >
                        <div style={styles.clientItemDot} />
                        <div>
                          <div style={styles.clientItemName}>{client.name}</div>
                          <div style={styles.clientItemDate}>
                            {new Date(client.updated_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main style={styles.main}>

          {/* EMPTY STATE */}
          {!activeClient ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyLogo}>
                <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 72, fontWeight: 300, color: 'rgba(168,85,247,0.15)', letterSpacing: -2 }}>B</span>
              </div>
              <h1 style={styles.emptyTitle}>Brava Closer</h1>
              <p style={styles.emptySubtitle}>Seu agente de fechamento inteligente</p>
              <div style={styles.emptyHint}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
                <span>Abra o menu e inicie com um cliente</span>
              </div>
            </div>
          ) : (
            <>
              {/* CONVERSATION */}
              <div style={styles.chatArea}>
                {conversation.length === 0 && (
                  <div style={styles.chatWelcome}>
                    <p style={styles.chatWelcomeTitle}>
                      Atendendo <em>{activeClient.name}</em>
                    </p>
                    <p style={styles.chatWelcomeHint}>Descreva a situação do cliente para começar</p>
                  </div>
                )}

                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className="msg-bubble"
                    style={{
                      ...styles.msgRow,
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {msg.role === 'assistant' && (
                      <div style={styles.agentAvatar}>A</div>
                    )}
                    <div style={{
                      ...styles.bubble,
                      ...(msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant),
                    }}>
                      {msg.content.split('\n').map((line, j) => (
                        <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                      ))}
                    </div>
                    {msg.role === 'user' && (
                      <div style={styles.userAvatar}>{userName[0].toUpperCase()}</div>
                    )}
                  </div>
                ))}

                {isThinking && !showReport && (
                  <div style={styles.msgRow}>
                    <div style={styles.agentAvatar}>A</div>
                    <div style={styles.thinkingBubble}>
                      <div className="thinking-dot" style={styles.dot} />
                      <div className="thinking-dot" style={styles.dot} />
                      <div className="thinking-dot" style={styles.dot} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* INPUT AREA */}
              <div style={styles.inputArea}>
                {conversation.length > 0 && (
                  <button style={styles.reportBtn} onClick={generateReport}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Relatório
                  </button>
                )}
                <div style={styles.inputBox}>
                  <textarea
                    ref={textareaRef}
                    style={styles.textarea}
                    placeholder="Digite sua mensagem..."
                    value={message}
                    onChange={e => { setMessage(e.target.value); autoResize(e); }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button
                    style={{ ...styles.sendBtn, opacity: message.trim() ? 1 : 0.4 }}
                    onClick={sendMessage}
                    disabled={!message.trim() || isThinking}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
                <div style={styles.inputHint}>Enter para enviar · Shift+Enter para nova linha</div>
              </div>
            </>
          )}
        </main>

        {/* REPORT MODAL */}
        {showReport && (
          <div style={styles.modalOverlay} onClick={() => setShowReport(false)}>
            <div style={styles.modal} className="modal-open" onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Relatório de Negociação</h2>
                <button style={styles.modalClose} onClick={() => setShowReport(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div style={styles.modalBody}>
                {isThinking && !report ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40, gap: 8 }}>
                    <div className="thinking-dot" style={styles.dot} />
                    <div className="thinking-dot" style={styles.dot} />
                    <div className="thinking-dot" style={styles.dot} />
                  </div>
                ) : (
                  <div style={styles.reportContent}>
                    {report.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.startsWith('#') ? (
                          <strong style={{ color: '#a855f7', fontFamily: 'Cormorant Garamond', fontSize: 18 }}>
                            {line.replace(/^#+\s/, '')}
                          </strong>
                        ) : line}
                        {'\n'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {report && (
                <div style={styles.modalFooter}>
                  <button style={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(report); }}>
                    Copiar relatório
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettings && (
          <div style={styles.modalOverlay} onClick={() => setShowSettings(false)}>
            <div style={styles.modal} className="modal-open" onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Configurações</h2>
                <button style={styles.modalClose} onClick={() => setShowSettings(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div style={styles.settingsTabs}>
                {['profile', 'password', 'biometria'].map(tab => (
                  <button
                    key={tab}
                    style={{ ...styles.settingsTab, ...(settingsTab === tab ? styles.settingsTabActive : {}) }}
                    onClick={() => { setSettingsTab(tab); setSettingsMsg(''); }}
                  >
                    {tab === 'profile' ? 'Perfil' : tab === 'password' ? 'Senha' : 'Biometria'}
                  </button>
                ))}
              </div>

              <div style={styles.modalBody}>
                {settingsTab === 'profile' && (
                  <div style={styles.settingsForm}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Nome</label>
                      <input
                        style={styles.formInput}
                        placeholder={userName}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>E-mail</label>
                      <input
                        style={styles.formInput}
                        placeholder={user.email}
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        type="email"
                      />
                    </div>
                    <button style={styles.saveBtn} onClick={updateProfile}>Salvar alterações</button>
                  </div>
                )}

                {settingsTab === 'password' && (
                  <div style={styles.settingsForm}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Nova senha</label>
                      <input
                        style={styles.formInput}
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Confirmar senha</label>
                      <input
                        style={styles.formInput}
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <button style={styles.saveBtn} onClick={updatePassword}>Atualizar senha</button>
                  </div>
                )}

                {settingsTab === 'biometria' && (
                  <div style={styles.settingsForm}>
                    <div style={styles.biometricInfo}>
                      <div style={styles.biometricIcon}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth="1">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                          <circle cx="12" cy="12" r="2"/>
                        </svg>
                      </div>
                      <p style={styles.biometricText}>
                        {biometricAvailable
                          ? 'Face ID ou Touch ID disponível no seu dispositivo.'
                          : 'Biometria não disponível neste dispositivo.'}
                      </p>
                      {biometricAvailable && (
                        <button style={styles.saveBtn} onClick={handleBiometricSetup}>
                          Configurar biometria
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {settingsMsg && (
                  <div style={{
                    ...styles.settingsMsg,
                    background: settingsMsgType === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: settingsMsgType === 'success' ? '#4ade80' : '#f87171',
                    borderColor: settingsMsgType === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                  }}>
                    {settingsMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0a0a0f',
    overflow: 'hidden',
  },
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0a0a0f',
    gap: 24,
  },
  loadingLogo: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 64,
    fontWeight: 300,
    color: '#a855f7',
    letterSpacing: -2,
  },
  loadingDots: {
    display: 'flex',
    gap: 8,
  },

  // HEADER
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 56,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(10,10,15,0.95)',
    backdropFilter: 'blur(20px)',
    flexShrink: 0,
    zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  menuBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(232,224,213,0.6)',
    padding: 6,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
  },
  logo: { display: 'flex', alignItems: 'baseline', gap: 2 },
  logoB: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 22,
    fontWeight: 600,
    color: '#a855f7',
    lineHeight: 1,
  },
  logoText: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 20,
    fontWeight: 300,
    color: '#e8e0d5',
    lineHeight: 1,
  },
  logoDivider: {
    color: 'rgba(168,85,247,0.4)',
    fontSize: 14,
    margin: '0 4px',
  },
  logoCloser: {
    fontFamily: 'Jost, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 3,
    color: 'rgba(168,85,247,0.8)',
    textTransform: 'uppercase',
  },
  activeClientBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: 'rgba(168,85,247,0.08)',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 20,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#a855f7',
    boxShadow: '0 0 6px rgba(168,85,247,0.8)',
  },
  activeClientName: {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(168,85,247,0.9)',
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(232,224,213,0.5)',
    padding: 7,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
  },

  // SIDEBAR
  sidebarOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
  },
  sidebar: {
    width: 280,
    maxWidth: '85vw',
    background: '#0f0f1a',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sidebarUserInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(168,85,247,0.6), rgba(168,85,247,0.2))',
    border: '1px solid rgba(168,85,247,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 18,
    fontWeight: 400,
    color: '#a855f7',
    flexShrink: 0,
  },
  sidebarUserName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e8e0d5',
  },
  sidebarUserEmail: {
    fontSize: 11,
    color: 'rgba(232,224,213,0.35)',
    marginTop: 2,
  },
  sidebarSection: {
    padding: '20px 20px 0',
  },
  sidebarSectionTitle: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2.5,
    color: 'rgba(168,85,247,0.5)',
    marginBottom: 10,
  },
  newClientRow: { display: 'flex', gap: 8 },
  sidebarInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    color: '#e8e0d5',
    transition: 'border-color 0.2s',
  },
  addBtn: {
    width: 36,
    height: 36,
    background: 'rgba(168,85,247,0.15)',
    border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a855f7',
    flexShrink: 0,
  },
  clientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: '50vh',
    overflowY: 'auto',
    paddingBottom: 16,
  },
  clientItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
    width: '100%',
  },
  clientItemActive: {
    background: 'rgba(168,85,247,0.1)',
  },
  clientItemDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'rgba(168,85,247,0.5)',
    flexShrink: 0,
  },
  clientItemName: {
    fontSize: 13,
    color: '#e8e0d5',
    fontWeight: 400,
  },
  clientItemDate: {
    fontSize: 10,
    color: 'rgba(232,224,213,0.3)',
    marginTop: 2,
  },

  // MAIN
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 40,
  },
  emptyLogo: { marginBottom: 8 },
  emptyTitle: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 32,
    fontWeight: 300,
    color: 'rgba(232,224,213,0.8)',
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(232,224,213,0.35)',
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  emptyHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'rgba(168,85,247,0.06)',
    border: '1px solid rgba(168,85,247,0.15)',
    borderRadius: 20,
    fontSize: 12,
    color: 'rgba(168,85,247,0.7)',
  },

  // CHAT
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  chatWelcome: {
    textAlign: 'center',
    padding: '40px 20px 20px',
  },
  chatWelcomeTitle: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 22,
    fontWeight: 300,
    color: 'rgba(232,224,213,0.7)',
    fontStyle: 'italic',
  },
  chatWelcomeHint: {
    fontSize: 12,
    color: 'rgba(232,224,213,0.3)',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
  },
  agentAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(168,85,247,0.5), rgba(168,85,247,0.15))',
    border: '1px solid rgba(168,85,247,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: '#a855f7',
    flexShrink: 0,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(232,224,213,0.08)',
    border: '1px solid rgba(232,224,213,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(232,224,213,0.6)',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.6,
    letterSpacing: 0.2,
  },
  bubbleUser: {
    background: 'rgba(168,85,247,0.15)',
    border: '1px solid rgba(168,85,247,0.25)',
    color: '#e8e0d5',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: 'rgba(232,224,213,0.9)',
    borderBottomLeftRadius: 4,
  },
  thinkingBubble: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'rgba(168,85,247,0.7)',
    display: 'inline-block',
  },

  // INPUT
  inputArea: {
    padding: '12px 16px 16px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(10,10,15,0.8)',
    flexShrink: 0,
  },
  reportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    color: 'rgba(168,85,247,0.7)',
    marginBottom: 10,
    letterSpacing: 0.3,
    transition: 'all 0.2s',
  },
  inputBox: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '8px 8px 8px 14px',
    transition: 'border-color 0.2s',
  },
  textarea: {
    flex: 1,
    fontSize: 14,
    lineHeight: 1.5,
    color: '#e8e0d5',
    maxHeight: 120,
    overflowY: 'auto',
    padding: '2px 0',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(135deg, rgba(168,85,247,0.8), rgba(168,85,247,0.5))',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
    transition: 'opacity 0.2s, transform 0.1s',
  },
  inputHint: {
    fontSize: 10,
    color: 'rgba(232,224,213,0.2)',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // MODALS
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0 0 0 0',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    background: '#0f0f1a',
    borderRadius: '20px 20px 0 0',
    border: '1px solid rgba(255,255,255,0.07)',
    borderBottom: 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 20,
    fontWeight: 400,
    color: '#e8e0d5',
    letterSpacing: 0.5,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(232,224,213,0.4)',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
    borderRadius: 6,
  },
  modalBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  modalFooter: {
    padding: '12px 20px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  reportContent: {
    whiteSpace: 'pre-wrap',
    fontSize: 13,
    lineHeight: 1.8,
    color: 'rgba(232,224,213,0.85)',
    fontFamily: 'Jost, sans-serif',
  },
  copyBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(168,85,247,0.12)',
    border: '1px solid rgba(168,85,247,0.25)',
    borderRadius: 10,
    color: '#a855f7',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.5,
    transition: 'all 0.2s',
  },

  // SETTINGS
  settingsTabs: {
    display: 'flex',
    padding: '0 20px',
    gap: 0,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  settingsTab: {
    flex: 1,
    padding: '12px 8px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: 0.5,
    color: 'rgba(232,224,213,0.35)',
    transition: 'all 0.2s',
  },
  settingsTabActive: {
    color: '#a855f7',
    borderBottomColor: '#a855f7',
  },
  settingsForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 1.5,
    color: 'rgba(232,224,213,0.35)',
    textTransform: 'uppercase',
  },
  formInput: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: 14,
    color: '#e8e0d5',
    width: '100%',
    transition: 'border-color 0.2s',
  },
  saveBtn: {
    padding: '12px',
    background: 'linear-gradient(135deg, rgba(168,85,247,0.7), rgba(168,85,247,0.4))',
    border: '1px solid rgba(168,85,247,0.4)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.5,
    marginTop: 4,
    transition: 'all 0.2s',
  },
  settingsMsg: {
    marginTop: 12,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 13,
  },
  biometricInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '16px 0',
    textAlign: 'center',
  },
  biometricIcon: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(168,85,247,0.08)',
    border: '1px solid rgba(168,85,247,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricText: {
    fontSize: 13,
    color: 'rgba(232,224,213,0.5)',
    lineHeight: 1.6,
    maxWidth: 260,
  },
};