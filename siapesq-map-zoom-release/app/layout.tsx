import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext";
import { PlatformThemeProvider } from "@/context/PlatformThemeContext"; 
import "leaflet/dist/leaflet.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "SIAPESQ - Sistema de Análises Geoespaciais",
  description: "Plataforma para visualização e análise de dados geoespaciais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} font-sans antialiased`}>
          <PlatformThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </PlatformThemeProvider>
      </body>
    </html>
  );
}


