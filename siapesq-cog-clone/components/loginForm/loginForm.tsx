"use client";

import Link from "next/link";
import { useState } from "react";
import ForgotpwdModal from "../forgotpw-modal/ForgotPasswordModal";

type LoginFormProps = {
  email: string;
  password: string;
  rememberMe: boolean;
  loading: boolean;
  error?: string | null;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onRememberChange: () => void;
  onSubmit: () => void;
};

export function LoginForm({
  email,
  password,
  rememberMe,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onRememberChange,
  onSubmit,
}: LoginFormProps) {
  const [modalPwd, setModalPwd] = useState(false);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="login-email"
            className="text-[12px] font-semibold text-[#334155]"
          >
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            placeholder="Seu email"
            onChange={(e) => onEmailChange(e.target.value)}
            className="bg-white border border-[#e2e8f0] rounded px-3 py-[10px] text-[14px] text-[#1e293b] placeholder:text-[#6b7280] shadow-[0px_4px_10px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-[#3498db] transition-shadow"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="login-password"
            className="text-[12px] font-semibold text-[#334155]"
          >
            Senha
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            placeholder="Sua senha"
            onChange={(e) => onPasswordChange(e.target.value)}
            className="bg-white border border-[#e2e8f0] rounded px-3 py-[10px] text-[14px] text-[#1e293b] placeholder:text-[#6b7280] shadow-[0px_4px_10px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-[#3498db] transition-shadow"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <label
            htmlFor="login-remember-me"
            className="flex items-center gap-2 cursor-pointer text-[14px] text-[#43474f]"
          >
            <input
              id="login-remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={onRememberChange}
              className="w-4 h-4 rounded accent-[#3498db]"
            />
            Lembrar-me
          </label>
          <button
            type="button"
            onClick={() => setModalPwd(true)}
            className="text-[14px] font-bold text-[#001e40] hover:underline"
          >
            Esqueci minha senha?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3498db] text-white text-[14px] font-bold py-[10px] rounded shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] hover:bg-[#2980b9] transition-colors disabled:opacity-60 mt-2"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-[15px] pt-2">
          <span className="text-[#233263]">Não tem conta ?</span>{" "}
          <Link
            href="/register"
            className="text-[#2784be] underline hover:text-[#2980b9] transition-colors"
          >
            Cadastre-se
          </Link>
        </p>
      </form>

      {modalPwd && <ForgotpwdModal setModalPwd={setModalPwd} />}
    </>
  );
}
