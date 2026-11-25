/**
 * Componente ExpandableMenuItem
 * 
 * Um item de menu expansível que pode conter sub-itens (children).
 * Suporta comportamento somente-botão ou link+botão para navegação flexível.
 * 
 * Principais características:
 * - Estado de expansão controlado por pathname: fecha automaticamente fora de /ecologicalModels
 * - Estado persistido no localStorage APENAS quando em /ecologicalModels
 * - Comportamento duplo quando href é fornecido: navega E alterna a expansão
 * - Suporte completo à navegação por teclado (teclas Enter e Espaço)
 * - Anúncios para leitores de tela sobre mudanças no estado de expansão
 * - Animações suaves nas transições de expandir/recolher
 * 
 * Comportamento de navegação:
 * - Quando href é fornecido: Renderiza como um Link que navega e também alterna a expansão  
 *   Isso permite que o usuário acesse rapidamente a página principal enquanto ainda pode  
 *   expandir o menu para ver as sub-opções
 * - Quando href é omitido: Renderiza como um botão que apenas alterna a expansão
 * 
 * Acessibilidade:
 * - Atributos ARIA: aria-expanded, aria-controls, aria-label
 * - Anúncios para leitores de tela via região aria-live
 * - Navegação por teclado: teclas Enter e Espaço alternam a expansão
 * - Gerenciamento de foco com indicadores de foco visíveis
 * - HTML semântico com os papéis apropriados
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router"; // ← ADICIONADO para monitorar pathname
import { IconType } from "react-icons";

interface ExpandableMenuItemProps {
  label: string;
  icon?: IconType;            // Icon as React component type from react-icons
  href?: string;              // Optional navigation target (enables dual behavior)
  children: React.ReactNode;  // Sub-menu items (typically AnalysisOption components)
  defaultExpanded?: boolean;  // Initial expansion state (overridden by logic)
  disabled?: boolean;         // Disable interaction (reduces opacity, prevents clicks)
}

export default function ExpandableMenuItem({
  label,
  icon,
  href,
  children,
  defaultExpanded = false,
  disabled = false,
}: ExpandableMenuItemProps) {
  const router = useRouter(); // ← ADICIONADO
  const pathname = router.pathname; // ← ADICIONADO
  const storageKey = `menu-expanded-${label.toLowerCase().replace(/\s+/g, "-")}`;
  
  const announcementRef = useRef<HTMLDivElement>(null);

  // ← MODIFICADO: Sempre inicia fechado, controlado por pathname
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // ← NOVO: Controla expansão baseado no pathname E localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Só pode estar expandido SE estiver na página ecologicalModels
    if (pathname === "/ecologicalModels") {
      const stored = localStorage.getItem(storageKey);
      setIsExpanded(stored === "true");
    } else {
      // Fora de ecologicalModels → força fechado e limpa localStorage
      setIsExpanded(false);
      localStorage.setItem(storageKey, "false");
    }
  }, [pathname, storageKey]);

  // Salva no localStorage APENAS quando em ecologicalModels
  useEffect(() => {
    if (typeof window !== "undefined" && pathname === "/ecologicalModels") {
      localStorage.setItem(storageKey, String(isExpanded));
    }
  }, [isExpanded, storageKey, pathname]);

  useEffect(() => {
    if (announcementRef.current) {
      const message = isExpanded 
        ? `${label} menu expanded` 
        : `${label} menu collapsed`;
      announcementRef.current.textContent = message;
    }
  }, [isExpanded, label]);

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Don't prevent default when href is provided - allow Link navigation
    // Only prevent default for button-only behavior
    if (!href) {
      e.preventDefault();
    }
    if (!disabled) {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      handleToggle(e);
    }
  };

  const menuItemContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        {icon && React.createElement(icon, { className: "inline-block size-5", "aria-hidden": "true" })}
        <span>{label}</span>
      </div>
      <svg
        className={`size-5 transition-transform duration-300 ${
          isExpanded ? "rotate-180" : "rotate-0"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );

  return (
    <li role="none">
      <div
        ref={announcementRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
     
      {href ? (
        <Link
          href={href}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={[
            "block rounded-md py-2 pe-2",
            "text-lg/7 font-regular no-underline",
            // Hover: subtle background, Focus: visible ring for keyboard users
            "hover:bg-light_green/5 focus:outline-none focus:ring-2 focus:ring-light_green/20",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            "text-light_green/90",
          ].join(" ")}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={`${storageKey}-content`}
          aria-label={`${label}, expandable menu, ${isExpanded ? "expanded" : "collapsed"}`}
          tabIndex={0}
        >
          {menuItemContent}
        </Link>
      ) : (
        <button
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={[
            "w-full text-left block rounded-md py-2 pe-2",
            "text-lg/7 font-regular",
            "hover:bg-light_green/5 focus:outline-none focus:ring-2 focus:ring-light_green/20",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            "text-light_green/90",
          ].join(" ")}
          aria-expanded={isExpanded}
          aria-controls={`${storageKey}-content`}
          aria-label={`${label}, expandable menu, ${isExpanded ? "expanded" : "collapsed"}`}
          disabled={disabled}
          type="button"
        >
          {menuItemContent}
        </button>
      )}
      
     
      <div
        id={`${storageKey}-content`}
        role="region"
        aria-label={`${label} options`}
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? "max-h-[250px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="list-none space-y-1 mt-2 pl-4 overflow-y-auto max-h-[240px] pr-2" role="menu" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(218, 246, 244, 0.3) transparent'
        }}>
          {children}
        </ul>
      </div>
    </li>
  );
}
