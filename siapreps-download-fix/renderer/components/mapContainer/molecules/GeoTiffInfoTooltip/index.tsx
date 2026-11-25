import React, { useEffect, useRef, useState } from "react";
import CloseIcon from "../../../../resources/icons/common/CloseIcon";

interface GeoTiffTooltip {
  onClose: () => void;
}

const STORAGE_KEY = "geoTiffTooltipSkipped";

/**
 * Exibe um tooltip com informações de como utilizar o GeoTiff.
 * @param {GeoTiffTooltip} props
 * @prop {function} onClose - Função chamada quando o usuário fecha o tooltip.
 */
const GeoTiffTooltip = ({ onClose }: GeoTiffTooltip) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onClose();
  };
  useEffect(() => {
    /**
     * Atualiza a posição do tooltip com base na tamanho da janela.
     * Centraliza o tooltip na tela, tanto vertical quanto horizontalmente.
     */
    const updatePosition = () => {
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        setPosition({
          // Centraliza verticalmente
          top: window.innerHeight / 2 - tooltipRect.height / 2 + window.scrollY,
          // Centraliza horizontalmente
          left: window.innerWidth / 2 - tooltipRect.width / 2 + window.scrollX,
        });
      }
    };

    // Chama a função updatePosition logo que o componente for montado
    updatePosition();
    // Adiciona um listener para atualizar a posição do tooltip sempre
    // que a janela for redimensionada
    window.addEventListener("resize", updatePosition);
    // Remove o listener quando o componente for desmontado
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        background: "rgba(0,0,0,0.8)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 10,
        paddingTop: 18,
        paddingRight: 20,
        borderRadius: 8,
        zIndex: 9999999,
        maxWidth: 300,
        textAlign: "center",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Arrow */}
      <div
        style={{
          position: "absolute",
          bottom: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "10px solid rgba(0, 0, 0, 0.8)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          cursor: "pointer",
        }}
        onClick={handleClose}
      >
        <CloseIcon width="20px" height="20px" fill="white" />
      </div>

      <p style={{ margin: 0 }}>
        Clique no mapa para visualizar informações adicionais sobre a espécie.
      </p>

      <label style={{ display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
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
  );
};

export default GeoTiffTooltip;
