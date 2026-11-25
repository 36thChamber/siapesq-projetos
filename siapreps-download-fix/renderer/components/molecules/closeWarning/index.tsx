import React, { useEffect, useState } from "react";
import ClosePopUp from "../../atoms/closePopup";

interface CloseWarningProps {
  lancamentos: number;
  tipoDeArte: string;
}

const CloseWarning: React.FC<CloseWarningProps> = ({ lancamentos, tipoDeArte }) => {
  const [showClosePopup, setShowClosePopup] = useState<boolean>(false);
  const [shouldClose, setShouldClose] = useState<boolean>(false);

  // Efeito para fechar a janela quando confirmado
  useEffect(() => {
    if (shouldClose) {
      // Define o tamanho do grupo baseado no tipo de arte
      const tamanhoGrupo = tipoDeArte?.toLowerCase() === 'espinhel' ? 3 : 6;
      
      // Limpa apenas os lançamentos incompletos
      const historicoAtual = localStorage.getItem("historicoLances");
      if (historicoAtual) {
        try {
          const historico = JSON.parse(historicoAtual);
          if (Array.isArray(historico)) {
            // Calcula quantos grupos completos existem
            const gruposCompletos = Math.floor(historico.length / tamanhoGrupo) * tamanhoGrupo;
            // Mantém apenas os grupos completos
            const historicoLimpo = historico.slice(0, gruposCompletos);
            
            localStorage.setItem("historicoLances", JSON.stringify(historicoLimpo));
          }
        } catch (error) {
          console.error("Erro ao processar histórico de lances:", error);
          // Se houver erro, limpa tudo como fallback
          localStorage.setItem("historicoLances", "");
        }
      }
      // Remove o listener antes de fechar para evitar loop
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.close();
    }
  }, [shouldClose, tipoDeArte]);

  // Função que será chamada no beforeunload
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    // Se há lançamentos pendentes e ainda não foi confirmado
    if (lancamentos > 0 && !shouldClose) {
      event.preventDefault();
      // Mostra o popup personalizado
      setShowClosePopup(true);
      // Retorna string para navegadores que mostram confirmação nativa
      event.returnValue = "Você possui lançamentos pendentes. Tem certeza que deseja sair?";
      return "Você possui lançamentos pendentes. Tem certeza que deseja sair?";
    }
    
    // Se não há lançamentos ou já foi confirmado, permite fechar
    return undefined;
  };

  // Efeito para interceptar o fechamento da janela
  useEffect(() => {
    // Adiciona o listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [lancamentos, shouldClose, tipoDeArte]); // Inclui tipoDeArte na dependência

  // Função para lidar com a confirmação do popup
  const handleCloseConfirmation = (userWantsToClose: boolean) => {
    console.log('Valor para fechar ou não:', userWantsToClose);
    setShowClosePopup(false);
    
    if (userWantsToClose) {
      // Define que deve fechar
      setShouldClose(true);
    }
    // Se não quer fechar, só esconde o popup
  };

  // Renderiza o popup apenas se deve ser mostrado
  return showClosePopup ? (
    <ClosePopUp 
      stateWindow={handleCloseConfirmation}
    />
  ) : null;
};

export default CloseWarning;