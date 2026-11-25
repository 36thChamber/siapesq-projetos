// renderer/pages/_app.tsx
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SpeciesProvider } from "../context/SpeciesContext";
import { useEffect } from "react";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export default function MyApp({ Component, pageProps }: AppProps) {

  useEffect(() => {
  window.logger.onLog((log) => {
    console.log("LOG DO MAIN:", log);
  });
}, []);

  return (
    <AuthProvider>
      <SpeciesProvider>
        <div className={poppins.variable}>
          <Component {...pageProps} />
        </div>
      </SpeciesProvider>
    </AuthProvider>
  );
}
