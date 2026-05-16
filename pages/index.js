import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SYSTEM_PROMPT = `Você é o BRAVA CLOSER — um agente de vendas consultivas no WhatsApp para fotografia e filmagem premium.

PRINCÍPIO CENTRAL: Nunca venda foto ou vídeo. Venda memória, experiência, significado e segurança na decisão. Venda como consequência da experiência. Autoridade sem arrogância. Condução sem pressão.

POSICIONAMENTO: Não competir por preço. Vender memória, não serviço. Especialista, nunca fornecedor. Fechar com autoridade.

REGRAS: Nunca falar de preço primeiro. Nunca proposta sem qualificar. Nunca parecer desesperado. Nunca desconto. Sempre gerar valor antes de números. Sempre terminar com pergunta.

SCRIPTS CASAMENTO:
- Abertura: "Me conta um pouco do evento: data, local e número de convidados?"
- Quebra de padrão: "Pra vocês, o que não pode faltar nesse dia?"
- Posicionamento: "Eu não sou o mais barato, porque não entrego algo comum. Meu foco é criar algo que faça sentido daqui 10, 20 anos."
- Proposta: "Os valores começam a partir de R$ 8.000, ajusto conforme o que vocês precisam."
- Fechamento: "Consigo montar algo bem alinhado com o que vocês imaginaram."

FLUXO DEBUTANTE (mais direto):
- Ensaio Anel: 2h, 30 fotos, maquiagem e cabelo — R$ 5.000
- Ensaio Coroa: 70 fotos, maquiagem + consultora de imagem — R$ 8.000
- Festa: making of + cobertura completa + prévias — R$ 8.000
- Álbum 25x25 / 40 fotos — R$ 2.800 | Álbum 30x30 / 60 fotos — R$ 3.800

OBJEÇÕES: "Tá caro" → valor e longevidade. "Vou pensar" → urgência de agenda. "Vendo outros" → reposicionar, não concorrente.

ESTILO: Curto, natural, sem robô, máximo 2 emojis, sempre terminar com pergunta.

FORMATO: APENAS a mensagem pronta para WhatsApp. Sem título, sem explicação.`;

const REPORT_PROMPT = `Você é o BRAVA CLOSER. Com base no histórico, gere um relatório executivo:

1. RESUMO DO CLIENTE — nome, tipo de evento, data, local
2. ESTÁGIO DA NEGOCIAÇÃO — onde está no funil
3. INTERESSES E DESEJOS — o que valoriza
4. OBJEÇÕES — o que travou ou pode travar
5. PRÓXIMOS PASSOS — ações concretas
6. OBSERVAÇÕES ESTRATÉGICAS — perfil do cliente

Formato: claro, direto, profissional, em tópicos.`;

async function askClaude(system, userText, imageB64, mime, maxTokens = 1000) {
  const content = [];
  if (imageB64) content.push({ type: "image", source: { type: "base64", media_type: mime || "image/jpeg", data: imageB64 } });
  content.push({ type: "text", text: userText });
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  if (!json.content) throw new Error("Resposta vazia");
  return json.content.map(b => b.text || "").join("").trim();
}

const mkClient = (name, type) => ({
  id: String(Date.now()), name: name.trim(), type,
  date: new Date().toLocaleDateString("pt-BR"), msgs: [],
});

const setupBiometry = () => {
  alert("🔒 Biometria em breve!\n\nEsta funcionalidade será ativada na próxima versão.");
};

// ─── Design tokens ───────────────────────────────────────────
const G = "linear-gradient(135deg,#7c3aed,#a855f7)";
const BG = "radial-gradient(ellipse at 50% -10%, #1c0a3e 0%, #07050f 55%)";

const S = {
  page: { minHeight: "100vh", width: "100%", background: BG, fontFamily: "'Jost',Georgia,serif", padding: "0 0 60px", color: "#ede6ff", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid rgba(168,85,247,0.1)", background: "rgba(7,5,15,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 },
  logoWrap: { display: "flex", alignItems: "center", gap: 9 },
  logoText: { fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: 4 },
  badge: { background: G, borderRadius: 5, padding: "3px 9px", fontSize: 8, letterSpacing: 4, color: "#fff", fontWeight: 500 },
  content: { padding: "20px 16px" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 16, padding: "16px", marginBottom: 10 },
  label: { fontSize: 9, letterSpacing: 3, color: "#a855f7", display: "block", marginBottom: 10 },
  input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 10, padding: "12px 14px", color: "#ede6ff", fontSize: 14, fontFamily: "'Jost',Georgia,serif", outline: "none", boxSizing: "border-box", lineHeight: 1.65 },
  btnPrimary: (on) => ({ width: "100%", padding: "15px", border: "none", borderRadius: 12, background: on ? G : "rgba(124,58,237,0.15)", color: on ? "#fff" : "rgba(255,255,255,0.2)", fontSize: 13, fontFamily: "'Jost',Georgia,serif", fontWeight: 500, letterSpacing: 2, cursor: on ? "pointer" : "not-allowed", marginBottom: 10, transition: "opacity 0.2s" }),
  btnGhost: { padding: "12px 16px", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 10, background: "transparent", color: "#6d4f8a", fontSize: 12, fontFamily: "'Jost',Georgia,serif", cursor: "pointer" },
  btnBack: { background: "none", border: "none", color: "#a855f7", fontSize: 12, fontFamily: "'Jost',Georgia,serif", cursor: "pointer", padding: 0, letterSpacing: 1 },
  err: { background: "rgba(220,50,50,0.07)", border: "1px solid rgba(220,50,50,0.22)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#f87171", lineHeight: 1.5 },
  clientRow: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" },
  clientName: { fontSize: 15, color: "#fff", marginBottom: 4, fontWeight: 500, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 0.5 },
  clientMeta: { fontSize: 11, color: "#6d4f8a", letterSpacing: 0.3 },
  histItem: (isAi) => ({ ...{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(168,85,247,${isAi ? "0.12" : "0.06"})`, borderLeft: `2px solid ${isAi ? "#7c3aed" : "rgba(168,85,247,0.2)"}`, borderRadius: 10, padding: "10px 13px", marginBottom: 7 } }),
};

// ─── Header reutilizável ──────────────────────────────────────
const Header = ({ left, right, center }) => (
  <div style={S.header}>
    <div style={{ minWidth: 80 }}>{left}</div>
    {center && <div style={{ textAlign: "center" }}>{center}</div>}
    <div style={{ minWidth: 80, display: "flex", justifyContent: "flex-end" }}>{right}</div>
  </div>
);

// ─── Divisor decorativo ───────────────────────────────────────
const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 14px" }}>
    <div style={{ flex: 1, height: 1, background: "rgba(168,85,247,0.1)" }} />
    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(168,85,247,0.3)" }} />
    <div style={{ flex: 1, height: 1, background: "rgba(168,85,247,0.1)" }} />
  </div>
);

export default function App() {
  const [clients, setClients] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("list");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("casamento");
  const [ctx, setCtx] = useState("");
  const [img, setImg] = useState(null);
  const [b64, setB64] = useState(null);
  const [mime, setMime] = useState("image/jpeg");
  const [resp, setResp] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [report, setReport] = useState("");
  const [rLoading, setRLoading] = useState(false);
  const [rCopied, setRCopied] = useState(false);
  const fileRef = useRef();

  const active = clients.find(c => c.id === activeId) || null;
  const goList = () => { setView("list"); setErr(""); };

  const createNewClient = () => {
    if (!newName.trim()) return;
    const c = mkClient(newName, newType);
    setClients(p => [c, ...p]);
    setActiveId(c.id); setNewName(""); setCtx(""); setResp(""); setErr("");
    setImg(null); setB64(null); setView("chat");
  };

  const openClient = (id) => {
    setActiveId(id); setCtx(""); setResp(""); setErr("");
    setImg(null); setB64(null); setView("chat");
  };

  const delClient = (id, e) => {
    e.stopPropagation();
    setClients(p => p.filter(c => c.id !== id));
    if (activeId === id) goList();
  };

  const handleImg = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setImg(URL.createObjectURL(f));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imgEl = new Image();
      imgEl.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.width; canvas.height = imgEl.height;
        const c2d = canvas.getContext("2d");
        c2d.drawImage(imgEl, 0, 0);
        const jpeg = canvas.toDataURL("image/jpeg", 0.85);
        setMime("image/jpeg"); setB64(jpeg.split(",")[1]);
      };
      imgEl.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };

  const clearImg = () => { setImg(null); setB64(null); if (fileRef.current) fileRef.current.value = ""; };
  const history = (msgs) => msgs.map(m => `[${m.r === "u" ? "CONTEXTO" : "RESPOSTA"}]: ${m.t}`).join("\n\n");

  const generate = async () => {
    if (!ctx.trim() && !b64) return;
    setLoading(true); setResp(""); setErr(""); setCopied(false);
    const hist = history(active.msgs);
    const histNote = hist ? `\n\nHISTÓRICO:\n${hist}\n\n---\n` : "";
    const txt = `Cliente: ${active.name} | Evento: ${active.type.toUpperCase()}${histNote}\nSituação: ${ctx.trim() || "[ver print]"}\n\nGere a resposta para WhatsApp.`;
    try {
      const text = await askClaude(SYSTEM_PROMPT, txt, b64, mime);
      setResp(text);
      const ts = new Date().toLocaleString("pt-BR");
      setClients(p => p.map(c => c.id === activeId ? {
        ...c, msgs: [...c.msgs, { r: "u", t: ctx.trim() || "[print]", ts }, { r: "a", t: text, ts }],
      } : c));
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const genReport = async () => {
    if (!active.msgs.length) { setReport("Nenhuma conversa ainda."); return; }
    setRLoading(true); setReport("");
    try {
      const txt = `Cliente: ${active.name} | Tipo: ${active.type}\n\n${history(active.msgs)}`;
      const text = await askClaude(REPORT_PROMPT, txt, null, null, 1500);
      setReport(text);
    } catch (e) { setReport("Erro: " + e.message); }
    setRLoading(false);
  };

  const copy = (t, fn) => { navigator.clipboard.writeText(t); fn(true); setTimeout(() => fn(false), 2500); };

  // ── VIEW: Novo cliente ──────────────────────────────────────
  if (view === "newClient") return (
    <div style={S.page}>
      <style>{globalStyle}</style>
      <Header
        left={<button style={S.btnBack} onClick={goList}>← VOLTAR</button>}
        right={<Logo />}
      />
      <div style={S.content}>
        <p style={{ fontSize: 11, color: "rgba(168,85,247,0.5)", letterSpacing: 2, marginBottom: 20 }}>NOVO CLIENTE</p>
        <div style={S.card}>
          <span style={S.label}>NOME DO CLIENTE</span>
          <input style={S.input} placeholder="Ex: Ana e Pedro" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createNewClient()} autoFocus />
        </div>
        <div style={{ ...S.card, padding: 5, display: "flex", gap: 4 }}>
          {["casamento", "debutante"].map(t => (
            <button key={t} onClick={() => setNewType(t)} style={{
              flex: 1, padding: "11px 10px", border: "none", borderRadius: 12, cursor: "pointer",
              background: newType === t ? G : "transparent",
              color: newType === t ? "#fff" : "#6d4f8a",
              fontSize: 13, fontFamily: "'Jost',Georgia,serif", letterSpacing: 1,
              transition: "background 0.2s",
            }}>{t === "casamento" ? "💍 Casamento" : "✨ Debutante"}</button>
          ))}
        </div>
        <div style={{ height: 8 }} />
        <button style={S.btnPrimary(!!newName.trim())} onClick={createNewClient} disabled={!newName.trim()}>
          CRIAR CONVERSA
        </button>
      </div>
    </div>
  );

  // ── VIEW: Lista de clientes ─────────────────────────────────
  if (view === "list") return (
    <div style={S.page}>
      <style>{globalStyle}</style>
      <Header
        left={<Logo />}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setView("newClient")} style={{
              background: G, border: "none", borderRadius: 9, color: "#fff",
              fontSize: 12, fontFamily: "'Jost',Georgia,serif", fontWeight: 500,
              cursor: "pointer", padding: "8px 14px", letterSpacing: 1,
            }}>+ NOVO</button>
            <button onClick={setupBiometry} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,85,247,0.18)",
              borderRadius: 9, color: "#a855f7", fontSize: 14, cursor: "pointer", padding: "7px 11px",
            }}>🔒</button>
            <button onClick={async () => { await supabaseClient.auth.signOut(); window.location.href = "/login"; }} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.14)",
              borderRadius: 9, color: "#6d4f8a", fontSize: 11, fontFamily: "'Jost',Georgia,serif",
              cursor: "pointer", padding: "7px 11px", letterSpacing: 1,
            }}>SAIR</button>
          </div>
        }
      />
      <div style={S.content}>
        {clients.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 72, color: "#6d4f8a" }}>
            <div style={{ fontSize: 42, marginBottom: 14, opacity: 0.5 }}>💬</div>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(168,85,247,0.4)", letterSpacing: 0.3 }}>
              Nenhum cliente ainda.<br />Toque em <span style={{ color: "#a855f7" }}>+ NOVO</span> para começar.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 9, color: "rgba(168,85,247,0.4)", letterSpacing: 3, marginBottom: 14 }}>
              {clients.length} {clients.length === 1 ? "CLIENTE" : "CLIENTES"}
            </p>
            {clients.map(c => (
              <div key={c.id} style={{ ...S.card, ...S.clientRow }} onClick={() => openClient(c.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.15))",
                    border: "1px solid rgba(168,85,247,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {c.type === "casamento" ? "💍" : "✨"}
                  </div>
                  <div>
                    <div style={S.clientName}>{c.name}</div>
                    <div style={S.clientMeta}>
                      {c.type} · {c.date} · {Math.floor(c.msgs.length / 2)} interações
                    </div>
                  </div>
                </div>
                <button onClick={e => delClient(c.id, e)}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.1)", fontSize: 17, cursor: "pointer", padding: "4px 8px" }}>✕</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );

  if (!active) { goList(); return null; }

  // ── VIEW: Relatório ─────────────────────────────────────────
  if (view === "report") return (
    <div style={S.page}>
      <style>{globalStyle}</style>
      <Header
        left={<button style={S.btnBack} onClick={() => setView("chat")}>← VOLTAR</button>}
        center={
          <div>
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 500, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>{active.name}</div>
            <div style={{ fontSize: 10, color: "#6d4f8a", letterSpacing: 1 }}>{active.type.toUpperCase()}</div>
          </div>
        }
        right={<div />}
      />
      <div style={S.content}>
        <p style={{ fontSize: 11, color: "rgba(168,85,247,0.5)", letterSpacing: 2, marginBottom: 18 }}>RELATÓRIO EXECUTIVO</p>
        {!report ? (
          <button style={S.btnPrimary(true)} onClick={genReport} disabled={rLoading}>
            {rLoading ? "GERANDO..." : "✦ GERAR RELATÓRIO"}
          </button>
        ) : (
          <div style={S.card}>
            <div style={{ fontSize: 13, lineHeight: 1.9, color: "#ede6ff", whiteSpace: "pre-wrap", marginBottom: 16 }}>{report}</div>
            <Divider />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => copy(report, setRCopied)} style={{
                flex: 1, padding: 12, border: "none", borderRadius: 10, cursor: "pointer",
                background: rCopied ? "rgba(34,197,94,0.12)" : G,
                color: rCopied ? "#86efac" : "#fff", fontSize: 13,
                fontFamily: "'Jost',Georgia,serif", letterSpacing: 1,
              }}>{rCopied ? "✓ COPIADO" : "📋 COPIAR RELATÓRIO"}</button>
              <button onClick={() => setReport("")} style={S.btnGhost}>Refazer</button>
            </div>
          </div>
        )}
        {active.msgs.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <span style={S.label}>HISTÓRICO COMPLETO</span>
            {active.msgs.map((m, i) => (
              <div key={i} style={S.histItem(m.r === "a")}>
                <div style={{ fontSize: 9, color: "#6d4f8a", marginBottom: 5, letterSpacing: 1 }}>{m.r === "a" ? "RESPOSTA" : "CONTEXTO"} · {m.ts}</div>
                <div style={{ fontSize: 12, color: "#ede6ff", lineHeight: 1.65 }}>{m.t}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── VIEW: Chat ──────────────────────────────────────────────
  const canGen = !loading && (!!ctx.trim() || !!b64);
  return (
    <div style={S.page}>
      <style>{globalStyle}</style>
      <Header
        left={<button style={S.btnBack} onClick={goList}>← CLIENTES</button>}
        center={
          <div>
            <div style={{ fontSize: 15, color: "#fff", fontWeight: 500, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>{active.name}</div>
            <div style={{ fontSize: 10, color: "#6d4f8a", letterSpacing: 0.5 }}>
              {active.type === "casamento" ? "💍" : "✨"} {active.type} · {Math.floor(active.msgs.length / 2)} interações
            </div>
          </div>
        }
        right={
          <button onClick={() => { setReport(""); setView("report"); }} style={{
            background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)",
            borderRadius: 8, color: "#a855f7", fontSize: 11,
            fontFamily: "'Jost',Georgia,serif", cursor: "pointer", padding: "7px 12px", letterSpacing: 1,
          }}>RELATÓRIO</button>
        }
      />

      <div style={S.content}>
        <div style={S.card}>
          <span style={S.label}>PRINT DA CONVERSA</span>
          {img ? (
            <div style={{ position: "relative", marginBottom: 14 }}>
              <img src={img} alt="print" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
              <button onClick={clearImg} style={{
                position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)",
                border: "none", borderRadius: 20, color: "#fff", fontSize: 11, padding: "4px 10px", cursor: "pointer",
              }}>✕ remover</button>
            </div>
          ) : (
            <div onClick={() => fileRef.current.click()} style={{
              border: "1.5px dashed rgba(168,85,247,0.22)", borderRadius: 12,
              padding: 22, textAlign: "center", cursor: "pointer",
              background: "rgba(168,85,247,0.02)", marginBottom: 14,
              transition: "border-color 0.2s, background 0.2s",
            }}>
              <div style={{ fontSize: 26, marginBottom: 7 }}>📱</div>
              <div style={{ fontSize: 12, color: "rgba(168,85,247,0.45)", letterSpacing: 0.5 }}>Toque para enviar o print</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImg} />
          <Divider />
          <span style={{ ...S.label, marginTop: 4 }}>OU DESCREVA A SITUAÇÃO</span>
          <textarea value={ctx} onChange={e => setCtx(e.target.value)}
            placeholder={active.type === "debutante" ? "Ex: Perguntou sobre Anel e Coroa..." : "Ex: Disse que está caro e vai pensar..."}
            rows={3} style={{ ...S.input, resize: "vertical", lineHeight: 1.65 }} />
        </div>

        {err && <div style={S.err}>⚠️ {err}</div>}

        <button style={S.btnPrimary(canGen)} onClick={generate} disabled={!canGen}>
          {loading ? "GERANDO..." : "✦ GERAR RESPOSTA"}
        </button>

        {resp && (
          <div style={S.card}>
            <span style={{ ...S.label, marginBottom: 12 }}>✓ RESPOSTA PRONTA</span>
            <div style={{
              background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: "14px 16px",
              fontSize: 14, lineHeight: 1.85, color: "#ede6ff", whiteSpace: "pre-wrap",
              marginBottom: 14, borderLeft: "2px solid #7c3aed",
            }}>{resp}</div>
            <Divider />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => copy(resp, setCopied)} style={{
                flex: 1, padding: 13, border: "none", borderRadius: 10, cursor: "pointer",
                background: copied ? "rgba(34,197,94,0.12)" : G,
                color: copied ? "#86efac" : "#fff", fontSize: 13,
                fontFamily: "'Jost',Georgia,serif", letterSpacing: 1,
              }}>{copied ? "✓ COPIADO" : "📋 COPIAR MENSAGEM"}</button>
              <button onClick={() => { setCtx(""); clearImg(); setResp(""); setErr(""); }} style={S.btnGhost}>Nova</button>
            </div>
          </div>
        )}

        {active.msgs.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span style={S.label}>HISTÓRICO RECENTE</span>
            {active.msgs.slice(-6).map((m, i) => (
              <div key={i} style={S.histItem(m.r === "a")}>
                <div style={{ fontSize: 9, color: "#6d4f8a", marginBottom: 4, letterSpacing: 1 }}>{m.r === "a" ? "RESPOSTA" : "CONTEXTO"} · {m.ts}</div>
                <div style={{ fontSize: 12, color: m.r === "a" ? "#ede6ff" : "rgba(237,230,255,0.45)", lineHeight: 1.55 }}>
                  {m.t.length > 130 ? m.t.slice(0, 130) + "…" : m.t}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Logo ─────────────────────────────────────────
const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: 4 }}>BRAVA</span>
    <span style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", borderRadius: 5, padding: "3px 8px", fontSize: 8, letterSpacing: 4, color: "#fff" }}>CLOSER</span>
  </div>
);

// ─── CSS global ──────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #07050f; width: 100%; }
  #__next { width: 100%; }
  textarea::placeholder, input::placeholder { color: rgba(109,79,138,0.4); }
  textarea:focus, input:focus { border-color: rgba(168,85,247,0.5) !important; outline: none; }
`;