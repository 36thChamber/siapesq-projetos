"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

export default function QuestionsSection() {
  const [keysD, setKeysD] = useState<number[]>([]);
  const { theme } = usePlatformTheme();

  const primaryColor = theme?.colors?.primary?.[500] || "#233263";
  const primarySoft = theme?.colors?.primary?.[100] || "#f8fafc";
  const borderColor = theme?.colors?.primary?.[200] || "#cbd5e1";

  const questions = [
    {
      question: "Como faço para alterar meu plano?",
      txt: "Você pode alterar seu plano a qualquer momento acessando sua página de perfil. Basta selecionar o gerenciador de planos e realizar a alteração do plano.\n\n A mudança será aplicada imediatamente ou no próximo ciclo de cobranças.",
    },
    {
      question:
        "Quais são as diferenças entre os planos Free, Basic, Professional e Research?",
      txt: "Os planos variam conforme o nível de uso e recursos disponíveis:\n- **Free:** acesso básico, com limitações de uso\n- **Basic:** mais recursos e maior volume de predições\n- **Professional:** funcionalidades completas + download de análises\n- **Research:** uso avançado, com recursos e volume ilimitados",
    },
    {
      question: "Como posso interpretar os resultados das análises?",
      txt: "Os resultados utilizam uma escala de cores do azul ao vermelho para indicar intensidade ou probabilidade:\n- **Azul:** baixa probabilidade\n- **Vermelho:** alta probabilidade\n- **Intermediários:** níveis graduais entre os dois extremos",
    },
  ];

  return (
    <div className="lg:col-span-2 space-y-3">
      {questions.map(({ question, txt }, i) => {
        const visible = keysD.includes(i);

        return (
          <div
            key={question}
            className="rounded-lg border bg-white text-left shadow-sm overflow-hidden"
            style={{
              color: primaryColor,
              borderColor,
            }}
          >
            <button
              className="w-full flex items-center justify-between rounded-lg border px-6 py-4 text-left font-medium transition hover:opacity-90"
              style={{
                color: primaryColor,
                borderColor,
                backgroundColor: visible ? primarySoft : "#ffffff",
              }}
              onClick={() => {
                setKeysD((keys) => {
                  if (!visible && txt.length > 0) return [...keys, i];

                  if (visible) {
                    return keys.filter((key) => key !== i);
                  }

                  return keys;
                });
              }}
            >
              <span>● {question}</span>

              <span
                className={`text-xl transition-transform ${
                  visible ? "rotate-90" : ""
                }`}
                style={{ color: primaryColor }}
              >
                ▶
              </span>
            </button>

            <div
              className={
                "flex flex-col transition-all " +
                (visible ? "gap-4 px-6 py-4" : "")
              }
            >
              <div
                className={`transition-all duration-300 ${
                  visible
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0 overflow-hidden"
                }`}
              >
                <Markdown
                  components={{
                    h1: () => null,
                    h2: () => null,
                    p: ({ children }) => (
                      <p className="mb-3 text-sm leading-6 text-slate-700">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-3 list-disc pl-5 text-sm leading-6 text-slate-700">
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => (
                      <strong
                        className="font-semibold"
                        style={{ color: primaryColor }}
                      >
                        {children}
                      </strong>
                    ),
                  }}
                >
                  {txt}
                </Markdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}