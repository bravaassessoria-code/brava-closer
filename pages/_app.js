import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = "#08080f";
    document.body.style.overflowX = "hidden";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.background = "#08080f";
  }, []);

  return <Component {...pageProps} />;
}