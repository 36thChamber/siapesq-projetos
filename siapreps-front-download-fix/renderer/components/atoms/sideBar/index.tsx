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
  nome_arquivo_nacional?: string | null;
  nome_arquivo_otimista?: string | null;
  nome_arquivo_pessimista?: string | null;
  nome_arquivo_30_otimista?: string | null;
  nome_arquivo_30_pessimista?: string | null;
  nome_arquivo_rs_otimista?: string | null;
  nome_arquivo_rs_pessimista?: string | null;
  nacional_incerteza?: string | null;
  nacional_ssp245_incerteza?: string | null;
  rs_ssp245_incerteza?: string | null;
  rs_ssp585_incerteza?: string | null;
  poligono_ssp245_incerteza?: string | null;
  poligono_ssp585_incerteza?: string | null;
  rs_incerteza?: string | null;
  poligono_incerteza?: string | null;
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
  { label: "Futuro 2050 Otimista", modelType: "futuro-2050-otimista" },
  { label: "Futuro 2050 Pessimista", modelType: "futuro-2050-pessimista" },
  { label: "Futuro 2100 Otimista", modelType: "futuro-2100-otimista" },
  { label: "Futuro 2100 Pessimista", modelType: "futuro-2100-pessimista" },
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
 * Cenários de Futuro 2050/2100: a mesma análise (mesmo id_analise) carrega
 * nome_arquivo_otimista e nome_arquivo_pessimista, então o modelType inclui
 * o cenário escolhido, mas a linha resolvida é a mesma para os dois.
 */
type CenarioFuturo = "otimista" | "pessimista";

const CENARIO_FUTURO_POR_MODEL_TYPE: Record<string, CenarioFuturo> = {
  "futuro-2050-otimista": "otimista",
  "futuro-2050-pessimista": "pessimista",
  "futuro-2100-otimista": "otimista",
  "futuro-2100-pessimista": "pessimista",
};

const suffixMap: Record<string, string> = {
  anual: "",
  "futuro-2050-otimista": "_2050",
  "futuro-2050-pessimista": "_2050",
  "futuro-2100-otimista": "_2100",
  "futuro-2100-pessimista": "_2100",
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

/**
 * Resolve SEMPRE a análise base.
 * `_1` nunca é retornado aqui.
 */
const resolveAnaliseForModel = (
  analyses: Analise[],
  modelType: string
): Analise | undefined => {
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

/**
 * Retorna o nome do arquivo a ser renderizado como "principal" para o modelType.
 * Para Futuro 2050/2100, usa o campo do cenário (otimista/pessimista) escolhido
 * em vez de nome_arquivo, já que essas análises não têm nome_arquivo_nacional.
 */
const resolveNomeArquivoPrincipal = (
  analise: Analise,
  modelType: string
): string | undefined => {
  const cenario = CENARIO_FUTURO_POR_MODEL_TYPE[modelType];
  if (!cenario) return analise.nome_arquivo;

  return cenario === "otimista"
    ? analise.nome_arquivo_otimista ?? undefined
    : analise.nome_arquivo_pessimista ?? undefined;
};

/**
 * Retorna o arquivo de 30 m correspondente ao cenário futuro escolhido.
 * Para análises não futuras, mantém o arquivo de 30 m padrão.
 */
const resolveNomeArquivo30 = (
  analise: Analise,
  modelType: string
): string | null => {
  const cenario = CENARIO_FUTURO_POR_MODEL_TYPE[modelType];
  if (!cenario) return analise.nome_arquivo_30 ?? null;

  return cenario === "otimista"
    ? analise.nome_arquivo_30_otimista ?? null
    : analise.nome_arquivo_30_pessimista ?? null;
};

/**
 * Retorna o nome do arquivo RS (regional, 250m) do cenário futuro escolhido,
 * para abrir em conjunto com o arquivo principal do cenário. Só se aplica a
 * Futuro 2050/2100; para os demais modelTypes não há arquivo RS.
 */
const resolveNomeArquivoRs = (
  analise: Analise,
  modelType: string
): string | null => {
  const cenario = CENARIO_FUTURO_POR_MODEL_TYPE[modelType];
  if (!cenario) return null;

  return cenario === "otimista"
    ? analise.nome_arquivo_rs_otimista ?? null
    : analise.nome_arquivo_rs_pessimista ?? null;
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

    const nomeArquivoPrincipal = resolveNomeArquivoPrincipal(
      analise,
      modelType
    );
    if (!nomeArquivoPrincipal) return;

    setSelectedAnalysis({
      ...analise,
      nome_arquivo: nomeArquivoPrincipal,
      nome_arquivo_principal: nomeArquivoPrincipal,
      nome_arquivo_30: resolveNomeArquivo30(analise, modelType),
      nome_arquivo_rs: resolveNomeArquivoRs(analise, modelType),
      modelType,
    });
  };

  const isAnalysisAvailable = (modelType: string) => {
    if (!selectedSpecies || !analyses.length) return false;
    const analise = resolveAnaliseForModel(analyses, modelType);
    if (!analise) return false;
    return !!resolveNomeArquivoPrincipal(analise, modelType);
  };

  const isAnalysisActive = (modelType: string) => {
    if (!selectedSpecies || !analyses.length || !selectedAnalysis) return false;
    return selectedAnalysis.modelType === modelType;
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
