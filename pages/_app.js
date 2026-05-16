import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function App({ Component, pageProps }) {
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = "#08080f";
    document.body.style.overflowX = "hidden";

    supabase.auth.getSession().then(({ data: { session } }) => {
      const isLoginPage = window.location.pathname === "/login";
      if (!session && !isLoginPage) {
        window.location.href = "/login";
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const isLoginPage = window.location.pathname === "/login";
      if (!session && !isLoginPage) {
        window.location.href = "/login";
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return <Component {...pageProps} />;
}