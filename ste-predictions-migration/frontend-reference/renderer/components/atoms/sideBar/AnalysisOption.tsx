/**
 * Componente AnalysisOption
 * 
 * Item individual do sub-menu para as opções de análise dos modelos ecológicos.
 * Aparece dentro do ExpandableMenuItem para "Modelos ecológicos".
 * 
 * Principais características:
 * - Estado desabilitado quando nenhuma espécie é selecionada (exibe tooltip ao passar o mouse ou focar)
 * - Estado ativo baseado nos parâmetros da URL
 * - Suporte completo à navegação por teclado
 * - Tooltip acessível explicando o motivo de estar desabilitado
 * 
 * Comportamento de navegação:
 * - Quando habilitado: ao clicar, navega para /ecologicalModels?species={id}&model={modelType}
 * - Quando desabilitado: exibe o tooltip "Selecione uma espécie primeiro" e impede a navegação
 * 
 * Estado Ativo:
 * - Determinado pelo componente pai SideBar através de isAnalysisActive()
 * - Verifica se o parâmetro "model" da URL atual corresponde ao modelType desta opção
 * - Opções ativas recebem fundo bg-light_green/10 para indicar visualmente
 */
"use client";

import React, { useState } from "react";

interface AnalysisOptionProps {
  label: string;        // Display text (e.g., "Anual", "Janeiro")
  modelType: string;    // URL parameter value (e.g., "anual", "janeiro")
  disabled: boolean;    // True when no species is selected
  active: boolean;      // True when this model is currently displayed
  onClick: () => void;  // Navigation handler from parent (includes species ID)
}

export default function AnalysisOption({
  label,
  modelType,
  disabled,
  active,
  onClick,
}: AnalysisOptionProps) {
/**
 * Estado de visibilidade do tooltip
 * Exibido apenas quando a opção está desabilitada (nenhuma espécie selecionada)
 * Fornece ao usuário uma explicação sobre por que a opção não está disponível
 */
  const [showTooltip, setShowTooltip] = useState(false);
/**
 * Lida com eventos de clique na opção de análise
 * 
 * Comportamento:
 * - Quando desabilitada: impede a navegação; o tooltip já está visível
 * - Quando habilitada: chama o handler onClick do componente pai (SideBar)
 *   que navega para /ecologicalModels?species={id}&model={modelType}
 * 
 * A verificação de desabilitado garante que o usuário não possa navegar
 * sem selecionar uma espécie primeiro
 */

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!disabled) {
      onClick();
    }
  };

/**
 * Suporte à navegação por teclado
 * 
 * Lida com as teclas Enter e Espaço para acionar a navegação
 * Garante que usuários de teclado tenham a mesma funcionalidade que usuários de mouse
 * Atendendo às diretrizes de acessibilidade do teclado da WCAG 2.1
 */

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter and Space keys for keyboard navigation
    if (e.key === "Enter" || e.key === " ") {
      handleClick(e);
    }
  };


  const handleMouseEnter = () => {
    if (disabled) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleFocus = () => {
    if (disabled) {
      setShowTooltip(true);
    }
  };

  const handleBlur = () => {
    setShowTooltip(false);
  };

  return (
    <li className="relative" role="none">
{/*
        Botão da opção de análise
        
        Estado desabilitado (nenhuma espécie selecionada):
        - opacity-50 para feedback visual
        - cursor-not-allowed para indicar indisponibilidade
        - tabIndex={-1} remove da ordem de tabulação do teclado
        - Exibe o tooltip ao passar o mouse/focar, explicando por que está desabilitado
        
        Estado ativo (modelo atual exibido):
        - Fundo bg-light_green/10 para indicação visual clara
        - aria-current="page" para anúncio por leitores de tela
        - Determinado pelo isAnalysisActive() do componente pai, verificando os parâmetros da URL
        
        Estado habilitado:
        - hover:bg-light_green/5 para um feedback suave ao passar o mouse
        - focus:ring-2 para um indicador de foco visível no teclado
        - tabIndex={0} inclui na ordem normal de tabulação
        
        Atributos ARIA:
        - aria-disabled: Anuncia o estado desabilitado para leitores de tela
        - aria-label: Fornece contexto completo, incluindo informações de estado
        - aria-current: Indica que esta é a página/visualização atualmente ativa
        - role="menuitem": Papel semântico para navegação em menus
      */}

      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={`${label} ecological model${disabled ? ", disabled, select a species first" : ""}${active ? ", currently active" : ""}`}
        aria-current={active ? "page" : undefined}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        type="button"
        className={[
          "w-full text-left block rounded-md py-2 px-4",
          "text-base font-regular",
          "transition-all duration-200",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-light_green/5 focus:outline-none focus:ring-2 focus:ring-light_green/20",
          active
            ? "bg-light_green/10 text-light_green"
            : "text-light_green/90",
        ].join(" ")}
      >
        {label}
      </button>
      
   
      {showTooltip && disabled && (
        <div
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-md whitespace-nowrap pointer-events-none"
          role="tooltip"
          id={`tooltip-${modelType}`}
          aria-hidden="false"
        >
          Selecione uma espécie primeiro
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
        </div>
      )}
    </li>
  );
}
