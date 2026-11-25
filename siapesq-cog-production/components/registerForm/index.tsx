import React from "react";
import Image from "next/image";
import { UploadIcon } from "@/components/icons";
import Link from "next/link";
import { RegisterData } from "@/services/types/usuario.types";

interface RegisterFormProps {
  formData: RegisterData;
  confirmarSenha: string;
  interfaceEstado: string;
  errors: { [key: string]: string };
  apiError: string | null;
  successMessage: string | null;
  loading: boolean;
  showCertificateUpload: boolean;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInterfaceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const labelClass = "text-[12px] font-semibold text-[#334155]";

const inputClass =
  "bg-white border border-[#e2e8f0] rounded px-3 py-[10px] text-[14px] text-[#1e293b] placeholder:text-[#6b7280] shadow-[0px_4px_10px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-[#3498db] transition-shadow";

const errorClass = "text-red-500 text-xs mt-0.5";

export default function RegisterForm({
  formData,
  confirmarSenha,
  interfaceEstado,
  errors,
  apiError,
  successMessage,
  loading,
  showCertificateUpload,
  onInputChange,
  onConfirmPasswordChange,
  onInterfaceChange,
  onSubmit,
}: RegisterFormProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-8">
        <Image src="/SIAPESQ5.png" alt="Logo SIAPESQ" width={180} height={47} />
        <p className="text-[#1e3a5f] text-[9px] tracking-[1px] uppercase font-semibold mt-2 text-center max-w-[320px] leading-relaxed">
          Sistema de Inteligência Artificial em Pesquisa Ambiental
        </p>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-[#1e293b] text-[22px] font-bold">Cadastre-se</h2>
        <p className="text-[#64748b] text-[13px] mt-1">
          Preencha os dados para cadastrar
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="register-nome" className={labelClass}>
            Nome
          </label>
          <input
            id="register-nome"
            type="text"
            name="nome"
            value={formData.nome}
            onChange={onInputChange}
            placeholder="Seu nome completo"
            className={inputClass}
          />
          {errors.nome && <p className={errorClass}>{errors.nome}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-email" className={labelClass}>
            E-mail
          </label>
          <input
            id="register-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={onInputChange}
            placeholder="Seu email"
            className={inputClass}
          />
          {errors.email && <p className={errorClass}>{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-curriculo-lattes" className={labelClass}>
            Currículo Lattes (Opcional)
          </label>
          <input
            id="register-curriculo-lattes"
            type="text"
            name="curriculo_lattes"
            value={formData.curriculo_lattes || ""}
            onChange={onInputChange}
            placeholder="Seu currículo lattes"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
          <div className="flex flex-col gap-1">
            <label htmlFor="register-senha" className={labelClass}>
              Senha
            </label>
            <input
              id="register-senha"
              type="password"
              name="senha"
              value={formData.senha || ""}
              onChange={onInputChange}
              placeholder="Sua senha"
              className={inputClass}
            />
            {errors.senha && <p className={errorClass}>{errors.senha}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="register-confirmar-senha" className={labelClass}>
              Confirmar senha
            </label>
            <input
              id="register-confirmar-senha"
              type="password"
              name="confirmarSenha"
              value={confirmarSenha}
              onChange={onConfirmPasswordChange}
              placeholder="Sua senha"
              className={inputClass}
            />
            {errors.confirmarSenha && (
              <p className={errorClass}>{errors.confirmarSenha}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
          <div className="flex flex-col gap-1">
            <label htmlFor="register-cpf" className={labelClass}>
              CPF
            </label>
            <input
              id="register-cpf"
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={onInputChange}
              placeholder="Seu CPF"
              className={inputClass}
            />
            {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="register-contato" className={labelClass}>
              Contato (Telefone)
            </label>
            <input
              id="register-contato"
              type="text"
              name="contato"
              value={formData.contato}
              onChange={onInputChange}
              placeholder="Seu telefone"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-interface-estado" className={labelClass}>
            Interface
          </label>
          <select
            id="register-interface-estado"
            name="interfaceEstado"
            value={interfaceEstado}
            onChange={onInterfaceChange}
            className={inputClass}
          >
            <option value="">Selecione sua interface</option>
            <option value="FAPERGS">FAPERGS (Padrão)  </option>
            <option value="FAPES">FAPES</option>
            <option value="FAPEMIG">FAPEMIG</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="titulo_cientifico"
            name="titulo_cientifico"
            checked={formData.titulo_cientifico}
            onChange={onInputChange}
            className="w-4 h-4 rounded accent-[#3498db] cursor-pointer"
          />
          <label
            htmlFor="titulo_cientifico"
            className="text-[14px] text-[#43474f] cursor-pointer select-none"
          >
            Possui Título Científico?
          </label>
        </div>

        {showCertificateUpload && (
          <div className="flex items-center gap-3">
            <input
              type="file"
              id="cert_cientifico"
              name="cert_cientifico"
              hidden
            />
            <label
              htmlFor="cert_cientifico"
              className="flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded cursor-pointer text-sm text-[#64748b] hover:border-[#3498db] transition-colors"
            >
              <UploadIcon size={15} />
              <span>Enviar comprovante</span>
            </label>
          </div>
        )}

        {apiError && (
          <p className="text-red-500 text-sm text-center">{apiError}</p>
        )}

        {successMessage && (
          <p className="text-green-600 text-sm text-center">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3498db] text-white text-[14px] font-bold py-[10px] rounded shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] hover:bg-[#2980b9] transition-colors disabled:opacity-60 mt-2"
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>

        <p className="text-center text-[15px] pt-2">
          <span className="text-[#233263]">Já tem conta?</span>{" "}
          <Link
            href="/login"
            className="text-[#2784be] underline hover:text-[#2980b9] transition-colors"
          >
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
