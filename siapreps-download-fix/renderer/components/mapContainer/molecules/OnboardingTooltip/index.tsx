import React, { useEffect, useRef, useState } from "react";
import CloseIcon from "../../../../resources/icons/common/CloseIcon";

type Tooltip = {
  id: string;
  text: string;
  ref: React.MutableRefObject<HTMLElement | null>;
};

interface IOnboardingTooltip {
  tooltip: Tooltip;
  visible: boolean;
  onNext: () => void;
  onClose: () => void;
}

/**
 * Componente de tooltip que aparece na parte superior da tela
 * quando o usuário acessa a tela de mapas pela primeira vez.
 * O componente é responsável por mostrar o texto de onboarding
 * e manter a visibilidade do tooltip até que o usuário clique
 * no botão "próximo" ou feche o tooltip.
 *
 * @param {Object} props
 * @param {Tooltip} props.tooltip - Objeto contendo o texto e a referência
 *                                 do elemento que deve ter o tooltip.
 * @param {boolean} props.visible - Flag que indica se o tooltip deve ser
 *                                visível ou não.
 * @param {function} props.onNext - Função chamada quando o usuário
 *                                clica no botão "próximo".
 * @param {function} props.onClose - Função chamada quando o usuário
 *                                 fecha o tooltip.
 */
const OnboardingTooltip = ({
  tooltip,
  visible,
  onNext,
  onClose,
}: IOnboardingTooltip) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placeBelow, setPlaceBelow] = useState(false);
  const [show, setShow] = useState(false); // para transição
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
  /**
   * Atualiza a posição do tooltip com base na janela.
   * Caso o tooltip tenha o id "map", centraliza-o na tela.
   * Caso contrário, verifica se o tooltip cabe acima ou abaixo do
   * elemento de referência e o posiciona de acordo.
   */
    const updatePosition = () => {
      const tooltipEl = tooltipRef.current;

      // Verifica se o ID do tooltip contém "map" e centraliza-o na tela
      if (/map/i.test(tooltip.id) && tooltipEl) {
        const tooltipRect = tooltipEl.getBoundingClientRect();
        setPlaceBelow(false);
        setPosition({
          top: window.innerHeight / 2 - tooltipRect.height / 2 + window.scrollY,
          left: window.innerWidth / 2 + window.scrollX,
        });
        return;
      }

      // Obtém o elemento alvo e calcula o posicionamento do tooltip
      const targetEl = tooltip.ref.current;
      if (targetEl && tooltipEl) {
        const targetRect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const tooltipHeight = tooltipRect.height;
        const windowHeight = window.innerHeight;

        // Calcula o espaço disponível acima e abaixo do elemento alvo
        const spaceAbove = targetRect.top;
        const spaceBelow = windowHeight - targetRect.bottom;
        const shouldPlaceBelow =
          spaceAbove < tooltipHeight && spaceBelow > tooltipHeight;

        // Define se o tooltip deve ser posicionado abaixo do elemento alvo
        setPlaceBelow(shouldPlaceBelow);

        // Calcula a posição vertical do tooltip
        const top = shouldPlaceBelow
          ? targetRect.bottom + window.scrollY + 25
          : targetRect.top + window.scrollY - 10;

        // Calcula a posição horizontal do tooltip
        const left = targetRect.left + window.scrollX + targetRect.width / 2;
        setPosition({ top, left });
      }
    };

    // Atualiza a posição e visibilidade do tooltip com base na visibilidade
    if (visible) {
      updatePosition();
      setShow(true);
    } else {
      setShow(false);
    }

    // Adiciona os event listeners para atualizar a posição em scroll e resize
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [tooltip, visible]);

  if (!visible || !tooltip.ref.current) return null;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        transform: placeBelow
          ? "translate(-50%, 0%)"
          : "translate(-50%, -100%)",
        background: "rgba(0,0,0,0.8)",
        minWidth: 175,
        color: "white",
        padding: 10,
        paddingTop: 25,
        borderRadius: 5,
        zIndex: 99999999,
        maxWidth: 300,
        textAlign: "center",
        display: visible ? "flex" : "none",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        opacity: show ? 1 : 0,
        transition: "opacity 0.3s ease, top 0.3s ease, left 0.3s ease",
        pointerEvents: show ? "auto" : "none",
      }}
    >
      {/* Close icon */}
      <div
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          cursor: "pointer",
        }}
        onClick={onClose}
      >
        <CloseIcon width="20px" height="20px" fill="white" />
      </div>

      {/* Arrow */}
      <div
        style={{
          position: "absolute",
          top: placeBelow ? "-10px" : undefined,
          bottom: placeBelow ? undefined : "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          ...(placeBelow
            ? { borderBottom: "10px solid rgba(0,0,0,0.8)" }
            : { borderTop: "10px solid rgba(0,0,0,0.8)" }),
        }}
      />

      {/* Conteúdo */}
      <p style={{ margin: 0 }}>{tooltip.text}</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 15,
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <button
          style={{
            borderRadius: 50,
            border: "none",
            background: "white",
            color: "black",
            padding: "5px 10px",
            fontWeight: "bolder",
            cursor: "pointer",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
            maxHeight: 30,
            width: "50%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
          onClick={onNext}
        >
          Próximo
        </button>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            style={{
              transform: "scale(1.5)",
              cursor: "pointer",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
              width: 10,
              height: 10,
            }}
          />
          <span style={{ marginLeft: 5, fontSize: 12 }}>
            Não mostrar novamente
          </span>
        </label>
      </div>
    </div>
  );
};

export default OnboardingTooltip;
