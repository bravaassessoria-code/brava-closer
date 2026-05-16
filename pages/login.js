import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helpers para converter entre ArrayBuffer e Base64
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
    // Redireciona se já tem sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/";
    });

    const mob = isMobile();
    setMobile(mob);

    // Verifica suporte a biometria
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => {
          setBioAvailable(available);
          const stored = localStorage.getItem(STORAGE_KEY);
          const hasCredential = !!stored;
          setBioRegistered(hasCredential);

          // No celular com biometria registrada: tenta auto-login
          if (mob && available && hasCredential && !autoTriedRef.current) {
            autoTriedRef.current = true;
            setTimeout(() => handleBiometryLogin(true), 600);
          }
        });
    }
  }, []);

  // Login normal com e-mail e senha
  const handleLogin = async () => {
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    // Após login com senha no celular, oferece registrar biometria
    if (mobile && bioAvailable && !bioRegistered) {
      await registerBiometry();
    }
    window.location.href = "/";
    setLoading(false);
  };

  // Registra a biometria (WebAuthn) após login com senha
  const registerBiometry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode(user.id.slice(0, 64));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Brava Closer", id: window.location.hostname },
          user: {
            id: userId,
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });

      if (credential) {
        // Salva o ID da credencial localmente
        localStorage.setItem(STORAGE_KEY, buf2b64(credential.rawId));
        setBioRegistered(true);
      }
    } catch (e) {
      // Silencioso: se não conseguir registrar, sem problema
      console.log("Biometria não registrada:", e.message);
    }
  };

  // Autenticação com biometria (Face ID / digital)
  const handleBiometryLogin = async (auto = false) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      if (!auto) setError("Biometria não configurada. Faça login com e-mail e senha primeiro.");
      return;
    }

    if (!auto) setBioLoading(true);
    setError("");

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            type: "public-key",
            id: b642buf(stored),
            transports: ["internal"],
          }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (assertion) {
        // Biometria confirmada — restaura sessão do Supabase via refresh
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = "/";
          return;
        }

        // Sessão expirou: pede e-mail/senha uma vez e reregistra
        setError("Sessão expirada. Faça login com e-mail e senha para renovar.");
        localStorage.removeItem(STORAGE_KEY);
        setBioRegistered(false);
      }
    } catch (e) {
      if (!auto) {
        setError("Biometria falhou. Use e-mail e senha.");
      }
    }

    if (!auto) setBioLoading(false);
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

        {/* Mostra indicador de biometria automática no celular */}
        {mobile && bioAvailable && bioRegistered && !error && (
          <div style={{
            textAlign: "center", marginBottom: 20,
            color: "#a855f7", fontSize: 13,
          }}>
            🔒 Aguardando Face ID...
          </div>
        )}

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

        {error && (
          <div style={{
            background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            fontSize: 12, color: "#f87171",
          }}>{error}</div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: 14, border: "none", borderRadius: 12,
          background: loading ? "rgba(124,58,237,0.3)" : P,
          color: "#fff", fontSize: 15, fontFamily: "Georgia,serif",
          cursor: loading ? "not-allowed" : "pointer", marginBottom: 12,
        }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* Botão de biometria: aparece no celular com suporte */}
        {mobile && bioAvailable && bioRegistered && (
          <button onClick={() => handleBiometryLogin(false)} disabled={bioLoading} style={{
            width: "100%", padding: 14,
            border: "1px solid rgba(168,85,247,0.3)",
            borderRadius: 12, background: "transparent",
            color: "#a855f7", fontSize: 14, fontFamily: "Georgia,serif",
            cursor: bioLoading ? "not-allowed" : "pointer",
          }}>
            {bioLoading ? "Verificando..." : "🔒 Entrar com Face ID / Digital"}
          </button>
        )}

        {/* Instrução para primeiro uso no celular */}
        {mobile && bioAvailable && !bioRegistered && (
          <p style={{ textAlign: "center", fontSize: 11, color: "#6d4f8a", marginTop: 8 }}>
            Faça login uma vez com e-mail e senha para ativar o Face ID nas próximas entradas.
          </p>
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