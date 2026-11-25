"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { type_get_response } from "../controllers/types/analises-types";

export interface Species {
  id: string;
  nome: string;
  grupo?: string;
}

export interface SelectedAnalysis extends type_get_response {
  nome_arquivo_principal: string;
  nome_arquivo_30?: string | null;
}

interface SpeciesContextType {
  selectedSpecies: Species | null;
  setSelectedSpecies: (species: Species | null) => void;
  analyses: type_get_response[];
  setAnalyses: (a: type_get_response[]) => void;
  selectedAnalysis: SelectedAnalysis | null;
  setSelectedAnalysis: (a: SelectedAnalysis | null) => void;
}

const SpeciesContext = createContext<SpeciesContextType | undefined>(undefined);

export const SpeciesProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSpecies, setSelectedSpeciesState] =
    useState<Species | null>(null);

  const [analyses, setAnalyses] = useState<type_get_response[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<SelectedAnalysis | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  // 🔄 Restaurar espécie do electron-store
  useEffect(() => {
    const restore = async () => {
      const stored = await window.species.getSelected();

      if (
        stored &&
        typeof stored.id === "string" &&
        typeof stored.nome === "string"
      ) {
        setSelectedSpeciesState(stored);
      }

      setIsInitialized(true);
    };

    restore();
  }, []);

  const setSelectedSpecies = async (species: Species | null) => {
    setSelectedSpeciesState(species);
    await window.species.setSelected(species);

    // 🔥 trocar espécie invalida análise
    setAnalyses([]);
    setSelectedAnalysis(null);
  };

  if (!isInitialized) return null;

  return (
    <SpeciesContext.Provider
      value={{
        selectedSpecies,
        setSelectedSpecies,
        analyses,
        setAnalyses,
        selectedAnalysis,
        setSelectedAnalysis,
      }}
    >
      {children}
    </SpeciesContext.Provider>
  );
};

export const useSpecies = (): SpeciesContextType => {
  const context = useContext(SpeciesContext);
  if (!context) {
    throw new Error("useSpecies must be used within a SpeciesProvider");
  }
  return context;
};
