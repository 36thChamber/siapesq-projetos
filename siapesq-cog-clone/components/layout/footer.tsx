"use client";
import Link from "next/link";
import Image from "next/image";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

export default function Footer() {
  const { theme } = usePlatformTheme();
  return <footer style={{backgroundColor:theme.colors.footer}} className="z-10 mt-auto w-full">
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <div className="relative h-12 w-32 rounded-md p-1"><Image src={theme.logo} alt={`Logo SIAPESQ ${theme.state}`} fill className="object-contain" sizes="128px" /></div>
          <p className="text-center text-xs text-gray-300 md:text-left">© SIAPESQ {new Date().getFullYear()}. Todos os direitos reservados.</p>
        </div>
        <nav aria-label="Links institucionais" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-gray-200">
          <Link href="/sobre-siapesq" className="hover:text-white">Sobre nós</Link>
          <Link href="/sobre-siapesq#contato" className="hover:text-white">Contato</Link>
          <Link href="/faq" className="hover:text-white">Ajuda</Link>
          <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
        </nav>
      </div>
    </div>
  </footer>;
}
