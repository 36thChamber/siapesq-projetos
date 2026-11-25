"use client";

import Image from "next/image";
import RegisterForm from "@/components/registerForm";
import { useRegisterForm } from "@/hook/useRegisterForm";

export default function RegisterSection() {
  const register = useRegisterForm();

  return (
    <div className="flex h-screen overflow-hidden">
      <div
        className="hidden lg:flex lg:w-[47%] flex-col justify-center items-center px-10 py-16 text-white shrink-0"
        style={{
          background:
            "linear-gradient(138.55deg, #1a8ea1 0%, #2980b9 40%, #7ec05a 100%)",
        }}
      >
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
              <span className="block whitespace-nowrap">
                Realize seu cadastro
              </span>
              <span className="block">na Plataforma SIAPESQ</span>
            </h1>
          </div>

          <div className="mb-8 drop-shadow-[0px_4px_6px_rgba(0,0,0,0.5)]">
            <p className="text-[14px] xl:text-[16px] leading-[1.8] text-white/90">
              Junte-se a nós e tenha acesso a dados detalhados para
              potencializar suas análises ambientais.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[#f8fafc] flex flex-col items-center justify-center px-8 overflow-auto">
        <div className="w-full max-w-[520px] flex flex-col items-center py-8">
          <RegisterForm
            formData={register.formData}
            confirmarSenha={register.confirmarSenha}
            interfaceEstado={register.interfaceEstado}
            errors={register.errors}
            apiError={register.apiError}
            successMessage={register.successMessage}
            loading={register.loading}
            showCertificateUpload={register.showCertificateUpload}
            onInputChange={register.handleInputChange}
            onConfirmPasswordChange={register.handleConfirmPasswordChange}
            onInterfaceChange={register.handleInterfaceChange}
            onSubmit={register.handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}