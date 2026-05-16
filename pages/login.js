import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometryAvailable, setBiometryAvailable] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/";
    });
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometryAvailable(available));
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos.");
    } else {
      window.location.href = "/";
    }
    setLoading(false);
  };

  const handleBiometryLogin = async () => {
    setError("");
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        }
      });
      if (credential) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = "/";
        } else {
          setError("Sessão expirada. Use e-mail e senha.");
        }
      }
    } catch (e) {
      setError("Biometria falhou. Use e-mail e senha.");
    }
  };

  const P = "linear-gradient(135deg,#6d28d9,#a855f7)";
  const BG = "linear-gradient(160deg,#08080f 0%,#10081e 60%,#08080f 100%)";

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: BG, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia,serif", padding: "24px 16px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(168,85,247,0.25)",
        borderRadius: 24, padding: "40px 32px",
        boxSizing: "border-box",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🦎</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: "bold", color: "#fff" }}>BRAVA</span>
            <span style={{ background: P, borderRadius: 6, padding: "3px 10px", fontSize: 10, letterSpacing: 3, color: "#fff", textTransform: "uppercase" }}>Closer</span>
          </div>
          <p style={{ fontSize: 13, color: "#6d4f8a", margin: "8px 0 0" }}>Entre na sua conta</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#a855f7", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>E-mail</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="voce@email.com"
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(168,85,247,0.25)", borderRadius: 10,
              padding: "12px 14px", color: "#ede6ff", fontSize: 14,
              fontFamily: "Georgia,serif", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, color: "#a855f7", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Senha</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(168,85,247,0.25)", borderRadius: 10,
              padding: "12px 14px", color: "#ede6ff", fontSize: 14,
              fontFamily: "Georgia,serif", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {error && <div style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#f87171" }}>{error}</div>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: 14, border: "none", borderRadius: 12,
          background: loading ? "rgba(124,58,237,0.3)" : P,
          color: "#fff", fontSize: 15, fontFamily: "Georgia,serif",
          cursor: loading ? "not-allowed" : "pointer", marginBottom: 12,
        }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {biometryAvailable && (
          <button onClick={handleBiometryLogin} style={{
            width: "100%", padding: 14, border: "1px solid rgba(168,85,247,0.3)",
            borderRadius: 12, background: "transparent",
            color: "#a855f7", fontSize: 14, fontFamily: "Georgia,serif",
            cursor: "pointer",
          }}>
            🔒 Entrar com Face ID / Digital
          </button>
        )}
      </div>

      <style>{`
        input::placeholder { color: rgba(109,79,138,0.5); }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #08080f; }
      `}</style>
    </div>
  );
}