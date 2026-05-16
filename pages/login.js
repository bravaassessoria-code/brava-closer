import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const LOGO = "data:image/png;base64,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";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometryAvailable, setBiometryAvailable] = useState(false);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then({ data: { session } }) => {
      if (session) window.location.href = "/";
    });
    // Check biometry availability
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometryAvailable(available));
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
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

  const handleBiometry = async () => {
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Faça login com e-mail primeiro para ativar a biometria.");
        return;
      }
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "Brava Closer", id: window.location.hostname },
          user: { id: new Uint8Array(16), name: session.user.email, displayName: "Brava" },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        }
      });
      if (credential) {
        localStorage.setItem("brava_biometry", "enabled");
        alert("Biometria ativada! Na próxima vez você pode entrar com Face ID ou impressão digital.");
      }
    } catch (e) {
      setError("Erro ao configurar biometria: " + e.message);
    }
  };

  const handleBiometryLogin = async () => {
    setError("");
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        }
      });
      if (credential) {
        // Re-authenticate with stored session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = "/";
        } else {
          setError("Sessão expirada. Faça login com e-mail.");
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
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={LOGO} alt="Brava" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 12 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: "bold", color: "#fff" }}>BRAVA</span>
            <span style={{ background: P, borderRadius: 6, padding: "3px 10px", fontSize: 10, letterSpacing: 3, color: "#fff", textTransform: "uppercase" }}>Closer</span>
          </div>
          <p style={{ fontSize: 13, color: "#6d4f8a", margin: "8px 0 0" }}>Entre na sua conta</p>
        </div>

        {/* Form */}
        <div>
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
              onKeyDown={e => e.key === "Enter" && handleLogin(e)}
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
              cursor: "pointer", marginBottom: 12,
            }}>
              🔒 Entrar com biometria
            </button>
          )}

          {biometryAvailable && (
            <button onClick={handleBiometry} style={{
              width: "100%", padding: 10, border: "none",
              borderRadius: 10, background: "transparent",
              color: "#6d4f8a", fontSize: 12, fontFamily: "Georgia,serif",
              cursor: "pointer",
            }}>
              Configurar biometria (Face ID / Digital)
            </button>
          )}
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(109,79,138,0.5); }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #08080f; }
      `}</style>
    </div>
  );
}