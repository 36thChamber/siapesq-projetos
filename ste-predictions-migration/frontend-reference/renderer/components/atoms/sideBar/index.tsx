"use client";

import { useRouter } from "next/router";
import Link from "next/link";
import { useSpecies } from "../../../context/SpeciesContext";
import ExpandableMenuItem from "./ExpandableMenuItem";
import AnalysisOption from "./AnalysisOption";
import { FaMapMarkerAlt, FaSignOutAlt, FaUser } from "react-icons/fa";
import { GoHome } from "react-icons/go";
import { PiPawPrint } from "react-icons/pi";
import { IconType } from "react-icons";
import { MdOutlineArticle, MdOutlineSatelliteAlt } from "react-icons/md";
import { useState, useRef, useEffect } from "react";
import { logout_usuario } from "../../../controllers/usuarios-controllers";

interface NavItem {
  label: string;
  href: string;
  Icon: IconType;
}

interface AnalysisModel {
  label: string;
  modelType: string;
}

interface Analise {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string;
}

const navBefore: NavItem[] = [
  { label: "Inicio", href: "/home", Icon: GoHome },
  { label: "Espécies", href: "/species", Icon: PiPawPrint },
];

const navAfter: NavItem[] = [
  { label: "Artigos", href: "/articles", Icon: MdOutlineArticle },
  { label: "Ocorrências", href: "/occurrences", Icon: FaMapMarkerAlt },
];

const analysisModels: AnalysisModel[] = [
  { label: "Anual", modelType: "anual" },
  { label: "Futuro 2050", modelType: "futuro-2050" },
  { label: "Futuro 2100", modelType: "futuro-2100" },
  { label: "Janeiro", modelType: "janeiro" },
  { label: "Fevereiro", modelType: "fevereiro" },
  { label: "Março", modelType: "marco" },
  { label: "Abril", modelType: "abril" },
  { label: "Maio", modelType: "maio" },
  { label: "Junho", modelType: "junho" },
  { label: "Julho", modelType: "julho" },
  { label: "Agosto", modelType: "agosto" },
  { label: "Setembro", modelType: "setembro" },
  { label: "Outubro", modelType: "outubro" },
  { label: "Novembro", modelType: "novembro" },
  { label: "Dezembro", modelType: "dezembro" },
];

/**
 * Resolve SEMPRE a análise base.
 * `_1` nunca é retornado aqui.
 */
const resolveAnaliseForModel = (
  analyses: Analise[],
  modelType: string
): Analise | undefined => {
  const suffixMap: Record<string, string> = {
    anual: "",
    "futuro-2050": "_2050",
    "futuro-2100": "_2100",
    janeiro: "_january",
    fevereiro: "_february",
    marco: "_march",
    abril: "_april",
    maio: "_may",
    junho: "_june",
    julho: "_july",
    agosto: "_august",
    setembro: "_september",
    outubro: "_october",
    novembro: "_november",
    dezembro: "_december",
  };

  const suffix = suffixMap[modelType];
  if (suffix === undefined) return undefined;

  // 🔥 tratamento especial para anual
  if (modelType === "anual") {
    return analyses.find(
      (a) =>
        a.nome_arquivo === a.nome_pasta && // base pura
        !a.nome_arquivo.endsWith("_1")
    );
  }

  return analyses.find(
    (a) =>
      a.nome_arquivo.endsWith(suffix) &&
      !a.nome_arquivo.endsWith("_1")
  );
};

export default function SideBar() {
  const router = useRouter();
  const pathname = router.pathname;

  const { selectedSpecies, analyses, selectedAnalysis, setSelectedAnalysis } =
    useSpecies();

  const handleAnalysisClick = (modelType: string) => {
    if (!selectedSpecies || !analyses.length) return;

    const analise = resolveAnaliseForModel(analyses, modelType);
    if (!analise) return;

    setSelectedAnalysis({
      ...analise,
      nome_arquivo_principal: analise.nome_arquivo,
      nome_arquivo_30: `${analise.nome_arquivo_30}`,
    });
  };

  const isAnalysisAvailable = (modelType: string) => {
    if (!selectedSpecies || !analyses.length) return false;
    return !!resolveAnaliseForModel(analyses, modelType);
  };

  const isAnalysisActive = (modelType: string) => {
    if (!selectedSpecies || !analyses.length || !selectedAnalysis) return false;
    const analise = resolveAnaliseForModel(analyses, modelType);
    return analise?.id_analise === selectedAnalysis.id_analise;
  };

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout_usuario();
      await window.auth.clearToken();
      router.push("/login");
    } catch {
      await window.auth.clearToken();
      router.push("/login");
    }
  };

  const isBlocked = !selectedSpecies;

  return (
    <aside className="flex h-screen w-60 flex-col bg-dark_green text-light_green ps-6 pe-4">
      <div className="flex h-22 items-center">
        <img src="/SIAPESQ5.svg" className="h-10" alt="SIAPESQ Logo" />
      </div>

      <nav className="flex-1">
        <ul className="space-y-3">
          {navBefore.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-md py-2 pe-2 text-lg ${
                    active
                      ? "bg-light_green/10 text-light_green"
                      : "text-light_green/90"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}

          <ExpandableMenuItem
            label="Modelos ecológicos"
            icon={MdOutlineSatelliteAlt}
            href="/ecologicalModels"
          >
            {analysisModels.map((model) => (
              <div key={model.modelType} className="relative">
                {isBlocked && (
                  <div className="absolute inset-0 z-10 cursor-not-allowed" />
                )}

                <AnalysisOption
                  label={model.label}
                  modelType={model.modelType}
                  disabled={isBlocked || !isAnalysisAvailable(model.modelType)}
                  active={isAnalysisActive(model.modelType)}
                  onClick={() => handleAnalysisClick(model.modelType)}
                />
              </div>
            ))}
          </ExpandableMenuItem>

          {navAfter.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-md py-2 pe-2 text-lg ${
                    active
                      ? "bg-light_green/10 text-light_green"
                      : "text-light_green/90"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto pb-5 relative" ref={profileMenuRef}>
        {isProfileMenuOpen && (
          <div className="absolute bottom-full left-0 w-full mb-2 bg-light_green rounded-md shadow-lg">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-3 text-dark_green"
              onClick={() => setIsProfileMenuOpen(false)}
            >
              <FaUser className="size-4" />
              Perfil
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-dark_green w-full text-left"
            >
              <FaSignOutAlt className="size-4" />
              Sair
            </button>
          </div>
        )}

        <button
          onClick={() => setIsProfileMenuOpen((p) => !p)}
          className="flex items-center gap-3 w-full py-2 text-light_green/90"
        >
          <img src="/icon_profile.svg" className="size-9" />
          <span className="text-[20px]">Perfil</span>
        </button>
      </div>
    </aside>
  );
}
