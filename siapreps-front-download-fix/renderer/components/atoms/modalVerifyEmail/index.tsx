"use client";

import { useEffect, useState } from "react";
import { send_verification_email } from "../../../controllers/usuarios-controllers";

type VerifyEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  id_usuario: string;
  email: string;
  nome: string;
};

export default function VerifyEmailModal({
  isOpen,
  onClose,
  id_usuario,
  email,
  nome,
}: VerifyEmailModalProps) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [visible, setVisible] = useState(false);

  /* controla animação de entrada/saída */
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  /* timer do cooldown */
  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setLoading(true);

    try {
      await send_verification_email({
        id_usuario,
        email,
        nome,
      });
      setCooldown(15);
    } catch (error) {
      console.error("Erro ao reenviar email", error);
    } finally {
      setLoading(false);
    }
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
          Verificação pendente
        </h2>

        <p className="text-dark_green-700">
          Olá <span className="font-medium">{nome}</span>, o seu e-mail{" "}
          <span className="font-medium">{email}</span> ainda não foi verificado.
        </p>

        <p className="text-dark_green-800 text-sm mt-3 bg-gray-100 p-3 rounded-lg">
          Enviamos um link de confirmação para sua caixa de entrada.
          Caso não encontre, verifique o spam.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {/* REENVIAR EMAIL */}
          <button
            onClick={handleResend}
            disabled={loading || cooldown > 0}
            className={`w-full py-2 rounded-xl transition
              ${
                loading || cooldown > 0
                  ? "bg-dark_green/60 text-white cursor-not-allowed"
                  : "bg-dark_green text-white hover:bg-dark_green/80"
              }
            `}
          >
            {loading
              ? "Enviando..."
              : cooldown > 0
              ? `Aguarde ${cooldown}s`
              : "Reenviar e-mail"}
          </button>

          {/* FECHAR */}
          <button
            onClick={handleClose}
            className="w-full bg-gray-300 text-dark_green-700 py-2 rounded-xl cursor-pointer hover:bg-gray-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
