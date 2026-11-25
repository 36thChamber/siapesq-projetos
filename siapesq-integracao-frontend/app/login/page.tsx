"use client";

import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/loginForm/loginForm";
import { useLogin } from "@/hook/useLogin";

export default function LoginPage() {
  const login = useLogin();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Coluna esquerda — Hero institucional */}
      <div
        className="hidden lg:flex lg:w-[47%] flex-col justify-center items-center px-10 py-16 text-white shrink-0"
        style={{ background: "linear-gradient(138.55deg, #1a8ea1 0%, #2980b9 40%, #7ec05a 100%)" }}
      >
        {/* Conteúdo centralizado com largura máxima para qualquer tela */}
        <div className="w-full max-w-[560px] flex flex-col items-start">
          <div className="mb-8 drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)]">
            <Image
              src="/logo_siapesq-extenso.png"
              alt="SIAPESQ"
              width={265}
              height={73}
              className="w-[220px] xl:w-[280px] 2xl:w-[340px] h-auto"
            />
          </div>

          <div className="mb-5 drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)]">
            <h1 className="text-[26px] xl:text-[34px] 2xl:text-[40px] font-bold leading-[1.2] tracking-[-0.8px]">
              <span className="block whitespace-nowrap">Bem-vindo à Plataforma</span>
              <span className="block">SIAPESQ</span>
            </h1>
          </div>

          <div className="mb-8 drop-shadow-[0px_4px_6px_rgba(0,0,0,0.5)]">
            <p className="text-[14px] xl:text-[16px] leading-[1.8] text-white/90">
              Inovação e pesquisa em um só lugar.
              <br />
              Conecte-se à maior rede de pesquisadores.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/15 border border-white/30 backdrop-blur-md shadow-[0px_4px_12px_rgba(0,0,0,0.2),inset_0px_1px_0px_rgba(255,255,255,0.25)]">
              <Image src="/graph.png" alt="" width={14} height={14} />
              <span className="text-[13px] xl:text-[14px] font-semibold">Análise Avançada</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/15 border border-white/30 backdrop-blur-md shadow-[0px_4px_12px_rgba(0,0,0,0.2),inset_0px_1px_0px_rgba(255,255,255,0.25)]">
              <Image src="/group.png" alt="" width={18} height={9} />
              <span className="text-[13px] xl:text-[14px] font-semibold">Colaboração</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna direita — Formulário */}
      <div className="flex-1 bg-[#f8fafc] flex flex-col items-center justify-center px-8 overflow-auto">
        <div className="w-full max-w-[520px] flex flex-col items-center">
          <div className="w-full flex flex-col items-center justify-center mb-8">
            <Image
              src="/logo_siapesq-extenso.png"
              alt="SIAPESQ"
              width={180}
              height={47}
              className="w-[260px] max-w-full h-auto lg:w-[280px]"
            />
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-[#1e293b] text-[22px] font-bold">Acesse sua conta</h2>
            <p className="text-[#64748b] text-[13px] mt-1">
              Entre com sua credenciais para continuar
            </p>
          </div>

          <div className="w-full">
            <LoginForm
              email={login.email}
              password={login.password}
              rememberMe={login.rememberMe}
              loading={login.loading}
              error={login.error}
              onEmailChange={login.setEmail}
              onPasswordChange={login.setPassword}
              onRememberChange={() => login.setRememberMe(!login.rememberMe)}
              onSubmit={login.handleSubmit}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[#233263] lg:hidden">
            <Link href="/sobre-siapesq" className="hover:underline">Sobre nós</Link>
            <span className="text-slate-400">•</span>
            <Link href="/planos" className="hover:underline">Planos</Link>
            <span className="text-slate-400">•</span>
            <Link href="/faq" className="hover:underline">Fale conosco</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
