import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext";
import { PlatformThemeProvider } from "@/context/PlatformThemeContext"; 
import "leaflet/dist/leaflet.css";
import { connection } from "next/server";
import { TestEnvironmentProvider } from "@/context/TestEnvironmentContext";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SIAPESQ - Sistema de Análises Geoespaciais",
  description: "Plataforma para visualização e análise de dados geoespaciais",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const testMode = process.env.CLONE_TEST_MODE === "true";
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} font-sans antialiased${testMode ? " clone-test-mode" : ""}`}>
          {testMode && <aside role="note" className="flex h-7 items-center justify-center bg-amber-100 px-3 text-center text-xs font-semibold text-amber-950">Ambiente de testes · pagamentos simulados</aside>}
          <TestEnvironmentProvider testMode={testMode}>
          <PlatformThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </PlatformThemeProvider>
          </TestEnvironmentProvider>
      </body>
    </html>
  );
}


