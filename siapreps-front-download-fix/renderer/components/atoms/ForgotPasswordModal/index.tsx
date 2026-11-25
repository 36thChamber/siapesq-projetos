import React from "react";
import InputDynamic from "../inputDynamic";
import { ButtonDynamic } from "../buttonDynamic/buttonDynamic";

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 
        bg-black/60 
        flex 
        items-center 
        justify-center 
        z-[9999]
      "
      onClick={onClose}
    >
      <div
        className="
          bg-[#d7f5f1]
          px-12 py-10
          rounded-xl
          shadow-[0_4px_25px_rgba(0,0,0,0.25)]
          w-[520px]
          relative
          animate-fadeIn
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* botão X */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 
            text-[#287e7e] 
            hover:opacity-80 
            transition
          "
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* título */}
        <h2 className="text-[32px] font-bold mb-1 text-center text-[#287e7e]">
          Esqueceu a senha ?
        </h2>

        {/* subtítulo */}
        <p className="mb-8 text-center text-[#287e7e] text-[15px]">
          Digite seu email para recuperar senha
        </p>

        {/* input + botão */}
        <form>
          <div className="flex items-end gap-3 justify-center">
            <div className="w-[320px]">
              <InputDynamic
                label="E-mail"
                placeholder="E-mail"
                frontIcon="/images/icons/mail.svg"
                width="w-full"
              />
            </div>

            <ButtonDynamic
              text="Enviar"
              className="
                bg-[#0c5952] 
                text-white 
                font-semibold 
                px-6 
                py-[9px] 
                rounded-md 
                hover:opacity-90 
                transition
              "
              type="submit"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
