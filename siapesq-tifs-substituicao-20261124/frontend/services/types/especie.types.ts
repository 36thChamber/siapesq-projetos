// services/types/especie.types.ts

import { GrupoEspecie } from '@/services/types/grupoEspecie.types';
import { InformacaoEspecie } from '@/services/types/informacaoEspecie.types';

// --- Payloads ---
export interface CriarEspeciePayload {
  nome: string;
  nome_cientifico: string;
  pesquisador: string;
  id_gruposespecies?: string;
  descricao?: string;
  tamanho?: string;
  status?: string;
  peso?: string;
  habitat?: string;
}

export interface AtualizarEspeciePayload {
  nome?: string;
  nome_cientifico?: string;
  id_gruposespecies?: string;
  pesquisador?: string;
  descricao?: string;
  tamanho?: string;
  status?: string;
  peso?: string;
  habitat?: string;
}

// --- Entidades ---
export interface Especie {
  fontes?: { titulo: string; url: string }[];
  is_aggregate?: boolean;
  id_especie: string;
  nome: string;
  nome_cientifico: string;
  id_gruposespecies?: string;
  pesquisador?: string;
  criado_em?: string;
  atualizado_em?: string | null;
  deletado_em?: string | null;
  tamanho?: string;
  status?: string;
  peso?: string;
  habitat?: string;
  informacoes?: InformacaoEspecie[];
  informacoesEspecies?: InformacaoEspecie[];
  descricao?: string | null;
  gbifUsageKey?: number;
  gbifImages?: string[];
  gbifMapUrl?: string;
  grupoespecie?: GrupoEspecie;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  lon?: number | string | null;
  coordenadas?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  localizacao?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
}

export type Specie = Especie;
export type SpecieInfo = InformacaoEspecie;
export { speciesList } from '@/services/types/gbif.types';

export interface RespostaPaginadaEspecies {
  total?: number;
  page?: number;
  limit?: number;
  data: Especie[];
}

