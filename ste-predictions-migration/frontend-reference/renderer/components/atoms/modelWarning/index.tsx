"use client";

import { useEffect, useState } from "react";

type ModalWarningProps = {
  close: () => void;
};

export default function ModalWarning({ close }: ModalWarningProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // ativa animação de entrada
    setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    // tempo da animação antes de desmontar
    setTimeout(close, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        className={`bg-light_green rounded-2xl shadow-xl p-8 w-[90%] max-w-md max-h-[90vh] overflow-auto relative
          transform transition-all duration-200 ease-out
          ${visible ? "opacity-100 scale-100" : "opacity-0 scale-90"}
        `}
      >
        {/* X para fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-dark_green-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-all duration-200"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold text-dark_green-700 mb-3">
          Análise não disponível
        </h2>

        <p className="text-dark_green-700 mb-4 leading-relaxed">
          A análise selecionada ainda está em processamento e não está disponível
          no momento. Por favor, aguarde até que o processamento seja concluído
          para acessar os resultados.
        </p>
      </div>
    </div>
  );
}
