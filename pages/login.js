import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const buf2b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b642buf = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const isMobile = () =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const STORAGE_KEY = "brava_webauthn_credential";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [mobile, setMobile] = useState(false);
  const autoTriedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/";
    });
    const mob = isMobile();
    setMobile(mob);
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
        setBioAvailable(available);
        const stored = localStorage.getItem(STORAGE_KEY);
        setBioRegistered(!!stored);
        if (mob && available && !!stored && !autoTriedRef.current) {
          autoTriedRef.current = true;
          setTimeout(() => handleBiometryLogin(true), 600);
        }
      });
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("E-mail ou senha incorretos."); setLoading(false); return; }
    if (mobile && bioAvailable && !bioRegistered) await registerBiometry();
    window.location.href = "/";
    setLoading(false);
  };

  const registerBiometry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode(user.id.slice(0, 64));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge, rp: { name: "Brava Closer", id: window.location.hostname },
          user: { id: userId, name: user.email, displayName: user.email },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        },
      });
      if (credential) { localStorage.setItem(STORAGE_KEY, buf2b64(credential.rawId)); setBioRegistered(true); }
    } catch (e) { console.log("Biometria não registrada:", e.message); }
  };

  const handleBiometryLogin = async (auto = false) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) { if (!auto) setError("Faça login com e-mail e senha primeiro para ativar o Face ID."); return; }
    if (!auto) setBioLoading(true);
    setError("");
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{ type: "public-key", id: b642buf(stored), transports: ["internal"] }],
          userVerification: "required", timeout: 60000,
        },
      });
      if (assertion) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { window.location.href = "/"; return; }
        setError("Sessão expirada. Entre com e-mail e senha.");
        localStorage.removeItem(STORAGE_KEY); setBioRegistered(false);
      }
    } catch (e) { if (!auto) setError("Biometria falhou. Use e-mail e senha."); }
    if (!auto) setBioLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0a0500; }
        .l-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(249,115,22,0.2); border-radius: 12px;
          padding: 14px 16px; color: #fff5ee; font-size: 15px;
          font-family: 'Jost', sans-serif; outline: none;
          transition: border-color 0.2s;
        }
        .l-input:focus { border-color: rgba(249,115,22,0.55); }
        .l-input::placeholder { color: rgba(249,115,22,0.28); }
        .l-btn {
          width: 100%; padding: 15px; border: none; border-radius: 12px;
          background: linear-gradient(135deg,#ea580c,#f97316);
          color: #fff; font-size: 13px; font-family: 'Jost', sans-serif;
          font-weight: 500; letter-spacing: 2px; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
        }
        .l-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .l-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .l-btn-ghost {
          width: 100%; padding: 14px; border: 1px solid rgba(249,115,22,0.25);
          border-radius: 12px; background: transparent;
          color: #f97316; font-size: 13px; font-family: 'Jost', sans-serif;
          letter-spacing: 1px; cursor: pointer;
          transition: background 0.2s;
        }
        .l-btn-ghost:hover { background: rgba(249,115,22,0.07); }
        .card-in { animation: cardIn 0.5s cubic-bezier(.22,.68,0,1.2) forwards; }
        @keyframes cardIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .logo-glow { animation: lglow 3s ease-in-out infinite; }
        @keyframes lglow {
          0%,100% { filter: drop-shadow(0 0 8px rgba(249,115,22,0.5)); }
          50% { filter: drop-shadow(0 0 22px rgba(249,115,22,0.85)); }
        }
        .glow-orb {
          position: fixed; top: -100px; left: 50%; transform: translateX(-50%);
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(194,65,12,0.13) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%",
        background: "radial-gradient(ellipse at 50% -10%, #3e1a0a 0%, #0a0500 55%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 20px", fontFamily: "'Jost', sans-serif", position: "relative",
      }}>
        <div className="glow-orb" />

        <div className="card-in" style={{ width: "100%", maxWidth: 390, position: "relative", zIndex: 1 }}>
          <div style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(249,115,22,0.18)",
            borderRadius: 24, padding: "44px 32px 36px",
          }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div className="logo-glow" style={{ display: "inline-block", marginBottom: 16 }}>
                <img
                  src="/logo.png?v=2"
                  alt="Brava"
                  style={{ width: 88, height: 88, objectFit: "contain" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 30, fontWeight: 600, color: "#fff", letterSpacing: 5,
                }}>BRAVA</span>
                <span style={{
                  background: "linear-gradient(135deg,#ea580c,#f97316)",
                  borderRadius: 6, padding: "4px 10px",
                  fontSize: 9, letterSpacing: 4, color: "#fff",
                  fontFamily: "'Jost', sans-serif", fontWeight: 500,
                }}>CLOSER</span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(249,115,22,0.5)", letterSpacing: 2.5 }}>
                ACESSE SUA CONTA
              </p>
            </div>

            {mobile && bioAvailable && bioRegistered && !error && (
              <div style={{
                textAlign: "center", marginBottom: 20, padding: "11px",
                border: "1px solid rgba(249,115,22,0.18)", borderRadius: 10,
                color: "#f97316", fontSize: 13,
                background: "rgba(249,115,22,0.05)",
              }}>
                🔒 Verificando Face ID...
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 9, color: "#f97316", letterSpacing: 3, marginBottom: 8 }}>E-MAIL</label>
              <input className="l-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 9, color: "#f97316", letterSpacing: 3, marginBottom: 8 }}>SENHA</label>
              <input className="l-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>

            {error && (
              <div style={{
                background: "rgba(220,50,50,0.07)", border: "1px solid rgba(220,50,50,0.22)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                fontSize: 12, color: "#f87171", lineHeight: 1.6,
              }}>{error}</div>
            )}

            <button className="l-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>

            {mobile && bioAvailable && bioRegistered && (
              <div style={{ marginTop: 12 }}>
                <button className="l-btn-ghost" onClick={() => handleBiometryLogin(false)} disabled={bioLoading}>
                  {bioLoading ? "VERIFICANDO..." : "🔒  FACE ID / DIGITAL"}
                </button>
              </div>
            )}

            {mobile && bioAvailable && !bioRegistered && (
              <p style={{ textAlign: "center", fontSize: 11, color: "rgba(249,115,22,0.35)", marginTop: 18, lineHeight: 1.7 }}>
                Faça login uma vez para ativar o Face ID nas próximas entradas.
              </p>
            )}
          </div>

          <p style={{ textAlign: "center", marginTop: 18, fontSize: 9, color: "rgba(249,115,22,0.2)", letterSpacing: 3 }}>
            BRAVA ASSESSORIA © 2025
          </p>
        </div>
      </div>
    </>
  );
}
