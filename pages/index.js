import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SYSTEM_PROMPT = `Você é um agente closer de vendas de alto nível da Brava Assessoria, especializado em fechar negócios imobiliários e de assessoria financeira. Está atendendo o cliente indicado.

Quando receber prints de conversa (imagens do WhatsApp ou outro app), analise com cuidado o que o cliente escreveu e sugira uma resposta pronta, persuasiva e estratégica que o closer pode copiar e enviar diretamente ao cliente.

Quando receber texto descrevendo a situação, gere a melhor resposta ou estratégia de fechamento.

Seja direto, empático, persuasivo. Identifique objeções e as supere com inteligência consultiva. Responda sempre em português brasileiro.

IMPORTANTE: Forneça sempre uma resposta/sugestão pronta que o closer pode usar imediatamente.`;

const mkClient = (name) => ({
  id: String(Date.now()),
  name: name.trim(),
  date: new Date().toLocaleDateString("pt-BR"),
  msgs: [],
});

const P = "linear-gradient(135deg,#6d28d9,#a855f7)";
const BG = "linear-gradient(160deg,#08080f 0%,#10081e 60%,#08080f 100%)";
const CARD = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 16, padding: 16, marginBottom: 12 };
const LBL = { fontSize: 10, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", display: "block", marginBottom: 10 };
const TA = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 10, padding: "12px 14px", color: "#ede6ff", fontSize: 14, resize: "vertical", fontFamily: "Georgia,serif", outline: "none", boxSizing: "border-box", lineHeight: 1.65 };
const INP = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 10, padding: "12px 14px", color: "#ede6ff", fontSize: 15, fontFamily: "Georgia,serif", outline: "none", boxSizing: "border-box" };
const BTN = (on) => ({ width: "100%", padding: 14, border: "none", borderRadius: 12, background: on ? P : "rgba(124,58,237,0.18)", color: on ? "#fff" : "rgba(255,255,255,0.25)", fontSize: 15, fontFamily: "Georgia,serif", cursor: on ? "pointer" : "not-allowed", marginBottom: 12 });
const GHOST = { padding: "12px 16px", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 10, background: "transparent", color: "#6d4f8a", fontSize: 13, fontFamily: "Georgia,serif", cursor: "pointer" };
const BACK = { background: "none", border: "none", color: "#a855f7", fontSize: 13, fontFamily: "Georgia,serif", cursor: "pointer", padding: 0 };
const BADGE = { background: P, borderRadius: 6, padding: "3px 10px", fontSize: 10, letterSpacing: 3, color: "#fff", textTransform: "uppercase" };
const ERR = { background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#f87171", lineHeight: 1.5 };
const PAGE = { minHeight: "100vh", width: "100%", background: BG, fontFamily: "Georgia,serif", color: "#ede6ff", boxSizing: "border-box", display: "flex", justifyContent: "center" };
const INNER = { width: "100%", maxWidth: 600, padding: "24px 16px 48px", boxSizing: "border-box" };
const BAR = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 };

export default function App() {
  const [clients, setClients] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("list");
  const [newName, setNewName] = useState("");
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
  const [user, setUser] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);
      loadClients(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); loadClients(session.user.id); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadClients(uid) {
    const { data } = await supabase.from("clients").select("*").eq("user_id", uid).order("updated_at", { ascending: false });
    if (data) setClients(data.map(c => ({ ...c, msgs: c.messages || [] })));
  }

  async function saveClient(client) {
    if (!user) return;
    const payload = { user_id: user.id, name: client.name, messages: client.msgs, updated_at: new Date().toISOString() };
    if (client.db_id) {
      await supabase.from("clients").update(payload).eq("id", client.db_id);
    } else {
      const { data } = await supabase.from("clients").insert(payload).select().single();
      if (data) setClients(p => p.map(c => c.id === client.id ? { ...c, db_id: data.id } : c));
    }
  }

  const active = clients.find(c => c.id === activeId) || null;
  const goList = () => { setView("list"); setErr(""); };

  const createNewClient = () => {
    if (!newName.trim()) return;
    const c = mkClient(newName);
    setClients(p => [c, ...p]);
    setActiveId(c.id);
    setNewName(""); setCtx(""); setResp(""); setErr("");
    setImg(null); setB64(null);
    setView("chat");
  };

  const openClient = (id) => {
    setActiveId(id); setCtx(""); setResp(""); setErr("");
    setImg(null); setB64(null); setView("chat");
  };

  const delClient = async (id, e) => {
    e.stopPropagation();
    const c = clients.find(x => x.id === id);
    if (c?.db_id) await supabase.from("clients").delete().eq("id", c.db_id);
    setClients(p => p.filter(c => c.id !== id));
    if (activeId === id) goList();
  };

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImg(URL.createObjectURL(f));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imgEl = new Image();
      imgEl.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.width; canvas.height = imgEl.height;
        canvas.getContext("2d").drawImage(imgEl, 0, 0);
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
    const txt = `Cliente: ${active.name}${histNote}\nSituação: ${ctx.trim() || "[ver print]"}\n\nGere a resposta.`;

    const content = [];
    if (b64) content.push({ type: "image", source: { type: "base64", media_type: mime, data: b64 } });
    content.push({ type: "text", text: txt });

    try {
      const res = await fetch("/api/claude", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system: SYSTEM_PROMPT, messages: [{ role: "user", content }] }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const text = json.content.map(b => b.text || "").join("").trim();
      setResp(text);
      const ts = new Date().toLocaleString("pt-BR");
      const updated = { ...active, msgs: [...active.msgs, { r: "u", t: ctx.trim() || "[print]", ts }, { r: "a", t: text, ts }] };
      setClients(p => p.map(c => c.id === activeId ? updated : c));
      await saveClient(updated);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const genReport = async () => {
    if (!active.msgs.length) { setReport("Nenhuma conversa ainda."); return; }
    setRLoading(true); setReport("");
    try {
      const txt = `Cliente: ${active.name}\n\n${history(active.msgs)}`;
      const res = await fetch("/api/claude", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: `Gere um relatório executivo da negociação:\n\n${txt}` }] }),
      });
      const json = await res.json();
      setReport(json.content.map(b => b.text || "").join("").trim());
    } catch (e) { setReport("Erro: " + e.message); }
    setRLoading(false);
  };

  const copy = (t, fn) => { navigator.clipboard.writeText(t); fn(true); setTimeout(() => fn(false), 2500); };

  if (!user) return <div style={{ ...PAGE, alignItems: "center" }}><div style={{ color: "#a855f7" }}>Carregando...</div></div>;

  if (view === "newClient") return (
    <div style={PAGE}><div style={INNER}>
      <div style={BAR}>
        <button style={BACK} onClick={goList}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 20, color: "#fff" }}>BRAVA</b><span style={BADGE}>Closer</span>
        </div>
      </div>
      <div style={CARD}>
        <span style={LBL}>Nome do cliente</span>
        <input style={INP} placeholder="Ex: João Silva" value={newName}
          onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && createNewClient()} autoFocus />
      </div>
      <button style={BTN(!!newName.trim())} onClick={createNewClient} disabled={!newName.trim()}>Criar conversa</button>
    </div></div>
  );

  if (view === "list") return (
    <div style={PAGE}><div style={INNER}>
      <div style={BAR}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 21, color: "#fff" }}>BRAVA</b><span style={BADGE}>Closer</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("newClient")} style={{ background: P, border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "Georgia,serif", cursor: "pointer", padding: "8px 16px" }}>+ Novo cliente</button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, color: "#6d4f8a", fontSize: 13, fontFamily: "Georgia,serif", cursor: "pointer", padding: "8px 14px" }}>Sair</button>
        </div>
      </div>
      {clients.length === 0
        ? <div style={{ textAlign: "center", marginTop: 64, color: "#6d4f8a" }}>
            <div style={{ fontSize: 38, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>Nenhum cliente ainda.<br />Toque em "+ Novo cliente" para começar.</p>
          </div>
        : clients.map(c => (
          <div key={c.id} style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => openClient(c.id)}>
            <div>
              <div style={{ fontSize: 15, color: "#fff", marginBottom: 4, fontWeight: "bold" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#6d4f8a" }}>{Math.floor((c.msgs?.length || 0) / 2)} interações</div>
            </div>
            <button onClick={e => delClient(c.id, e)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>✕</button>
          </div>
        ))
      }
    </div></div>
  );

  if (!active) { goList(); return null; }

  if (view === "report") return (
    <div style={PAGE}><div style={INNER}>
      <div style={BAR}>
        <button style={BACK} onClick={() => setView("chat")}>← Voltar</button>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: "#fff", fontWeight: "bold" }}>{active.name}</div>
        </div>
      </div>
      <div style={{ fontSize: 17, color: "#fff", marginBottom: 16, fontWeight: "bold" }}>📄 Relatório</div>
      {!report
        ? <button style={BTN(true)} onClick={genReport} disabled={rLoading}>{rLoading ? "✦ Gerando..." : "✦ Gerar relatório"}</button>
        : <div style={CARD}>
            <div style={{ fontSize: 13, lineHeight: 1.85, color: "#ede6ff", whiteSpace: "pre-wrap", marginBottom: 14 }}>{report}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => copy(report, setRCopied)} style={{ flex: 1, padding: 12, border: "none", borderRadius: 10, cursor: "pointer", background: rCopied ? "rgba(34,197,94,0.13)" : P, color: rCopied ? "#86efac" : "#fff", fontSize: 14, fontFamily: "Georgia,serif" }}>{rCopied ? "✓ Copiado!" : "📋 Copiar relatório"}</button>
              <button onClick={() => setReport("")} style={GHOST}>Refazer</button>
            </div>
          </div>
      }
    </div></div>
  );

  const canGen = !loading && (!!ctx.trim() || !!b64);
  return (
    <div style={PAGE}><div style={INNER}>
      <div style={BAR}>
        <button style={BACK} onClick={goList}>← Clientes</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: "bold" }}>{active.name}</div>
          <div style={{ fontSize: 11, color: "#6d4f8a" }}>{Math.floor((active.msgs?.length || 0) / 2)} interações</div>
        </div>
        <button onClick={() => { setReport(""); setView("report"); }} style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 8, color: "#a855f7", fontSize: 12, fontFamily: "Georgia,serif", cursor: "pointer", padding: "6px 12px" }}>📄 Relatório</button>
      </div>

      <div style={CARD}>
        <span style={LBL}>Print da conversa</span>
        {img ? (
          <div style={{ position: "relative", marginBottom: 14 }}>
            <img src={img} alt="print" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
            <button onClick={clearImg} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 20, color: "#fff", fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>✕ remover</button>
          </div>
        ) : (
          <div onClick={() => fileRef.current.click()} style={{ border: "1.5px dashed rgba(168,85,247,0.3)", borderRadius: 12, padding: 20, textAlign: "center", cursor: "pointer", background: "rgba(168,85,247,0.03)", marginBottom: 14 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📱</div>
            <div style={{ fontSize: 13, color: "#6d4f8a" }}>Toque para enviar o print</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImg} />
        <span style={{ ...LBL, marginTop: 4 }}>Ou descreva a situação</span>
        <textarea value={ctx} onChange={e => setCtx(e.target.value)} placeholder="Ex: Disse que está caro e vai pensar..." rows={3} style={TA} />
      </div>

      {err && <div style={ERR}>⚠️ {err}</div>}
      <button style={BTN(canGen)} onClick={generate} disabled={!canGen}>{loading ? "✦ Gerando..." : "✦ Gerar resposta"}</button>

      {resp && (
        <div style={CARD}>
          <span style={{ ...LBL, marginBottom: 12 }}>✓ Resposta pronta</span>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "14px 16px", fontSize: 14, lineHeight: 1.8, color: "#ede6ff", whiteSpace: "pre-wrap", marginBottom: 14, borderLeft: "2px solid #7c3aed" }}>{resp}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => copy(resp, setCopied)} style={{ flex: 1, padding: 13, border: "none", borderRadius: 10, cursor: "pointer", background: copied ? "rgba(34,197,94,0.13)" : P, color: copied ? "#86efac" : "#fff", fontSize: 14, fontFamily: "Georgia,serif" }}>{copied ? "✓ Copiado!" : "📋 Copiar mensagem"}</button>
            <button onClick={() => { setCtx(""); clearImg(); setResp(""); setErr(""); }} style={GHOST}>Nova</button>
          </div>
        </div>
      )}

      {active.msgs?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={LBL}>Histórico recente</span>
          {active.msgs.slice(-6).map((m, i) => (
            <div key={i} style={{ ...CARD, marginBottom: 6, padding: "10px 14px", borderLeft: `2px solid ${m.r === "a" ? "#7c3aed" : "rgba(168,85,247,0.2)"}` }}>
              <div style={{ fontSize: 9, color: "#6d4f8a", marginBottom: 4 }}>{m.r === "a" ? "RESPOSTA" : "CONTEXTO"} · {m.ts}</div>
              <div style={{ fontSize: 12, color: m.r === "a" ? "#ede6ff" : "rgba(237,230,255,0.5)", lineHeight: 1.5 }}>{m.t.length > 130 ? m.t.slice(0, 130) + "…" : m.t}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #08080f; width: 100%; }
        #__next { width: 100%; }
        textarea::placeholder { color: rgba(109,79,138,0.5); }
        input::placeholder { color: rgba(109,79,138,0.5); }
      `}</style>
    </div></div>
  );
          }
