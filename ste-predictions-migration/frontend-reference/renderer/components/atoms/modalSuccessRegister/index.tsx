"use client";

import { useEffect, useState } from "react";

type SuccessRegisterModalProps = {
  nome: string;
  email: string;
  emailSent: boolean;
  close: () => void;
};

export default function SuccessRegisterModal({
  nome,
  email,
  emailSent,
  close,
}: SuccessRegisterModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(close, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        className={`bg-light_green rounded-2xl shadow-xl p-8 w-[90%] max-w-md
          transform transition-all duration-200 ease-out
          ${visible ? "opacity-100 scale-100" : "opacity-0 scale-90"}
        `}
      >
        <h2 className="text-2xl font-bold text-dark_green-700 mb-3">
          Cadastro realizado!
        </h2>

        <p className="text-dark_green-700">
          Parabéns <span className="font-medium">{nome}</span>, seu cadastro foi
          concluído com sucesso.
        </p>

        <div className="mt-4 p-3 rounded-lg bg-gray-100">
          <p className="text-dark_green-800 text-sm">
            <span className="font-semibold">E-mail:</span> {email}
          </p>

          {emailSent ? (
            <p className="text-dark_green-700 font-medium text-sm mt-2">
              ✔ E-mail de verificação enviado! Verifique sua caixa de entrada.
            </p>
          ) : (
            <p className="text-red-600 font-medium text-sm mt-2">
              ❗ Não foi possível enviar o e-mail de verificação. Você pode tentar
              reenviá-lo pelo seu perfil.
            </p>
          )}
        </div>

        <button
          onClick={handleClose}
          className="mt-6 w-full bg-dark_green text-white py-2 rounded-xl transition-none cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
