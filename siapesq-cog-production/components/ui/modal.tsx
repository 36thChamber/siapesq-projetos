"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";

export type ModalButton = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
};

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  icon?: ReactNode; // Corrigido para ReactNode
  message?: ReactNode;
  buttons?: ModalButton[];
  className?: string;
  contentClassName?: string;
};

export default function Modal({
  isOpen,
  onClose,
  icon,
  message,
  buttons = [],
  className = "",
  contentClassName = "",
}: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl p-8 relative shadow-2xl border max-w-xl ${className} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()} // impede fechamento ao clicar dentro
      >
        {/* Ícone */}
        {icon && <div className="flex justify-center mb-6">{icon}</div>}

        {/* Conteúdo */}
        {message && (
          <div className={`text-center text-gray-700 leading-relaxed max-w-md mx-auto ${contentClassName}`}>
            {message}
          </div>
        )}

        {/* Botões */}
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center mt-8 pt-6 border-t">
            {buttons.map((btn, idx) => {
              const variantClasses = {
                primary: "bg-blue-600 text-white hover:bg-blue-700",
                secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
                danger: "bg-red-600 text-white hover:bg-red-700",
              };
              return (
                <button
                  key={idx}
                  onClick={btn.onClick}
                  className={`px-6 py-3 rounded-lg font-medium transition-all shadow-sm ${variantClasses[btn.variant || "primary"]} ${btn.className || ""}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Botão de fechar sempre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}
