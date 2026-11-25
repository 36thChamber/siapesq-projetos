import Especies from "../models/Especies";
import { stagingSpeciesMetadata } from "../utils/staging-catalog";

export type InformacaoEspecieResponse = {
  id_informacaoespecie: string;
  tipo_informacao: string;
  informacao: string;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type EspecieResponse = {
  id_especie: string;
  nome: string;
  nome_cientifico: string;
  id_gruposespecies: string;
  pesquisador: string;
  descricao: string | null;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
  informacoesEspecies?: InformacaoEspecieResponse[];
};

export type EspecieListResponse = {
  id_especie: string;
  nome: string;
  nome_cientifico: string;
  pesquisador: string;
};


export type CriarEspecieBodyRequest = {
  nome: string;
  nome_cientifico: string;
  id_gruposespecies: string;
  pesquisador: string;
  descricao?: string | null;
};

export type AtualizarEspecieBodyRequest = {
  nome?: string;
  nome_cientifico?: string;
  id_gruposespecies?: string;
  pesquisador?: string;
  descricao?: string | null;
};

export type BuscarEspeciePorIdParamsRequest = {
  id_especie: string;
};

export type DeletarEspecieParamsRequest = {
  id_especie: string;
};

export type ListarEspeciesQueryRequest = {
  limit?: number;
  offset?: number;
};

export type CriarEspecieResponse = EspecieResponse;
export type AtualizarEspecieResponse = EspecieResponse;
export type BuscarEspeciePorIdResponse = EspecieResponse;
export type DeletarEspecieResponse = EspecieResponse;

// export type ListarEspeciesResponse = {
//   especies: EspecieResponse[];
//   total: number;
// };

export type ListarEspeciesResponse = {
  especies: EspecieListResponse[];
  total: number;
};

export function toEspecieResponse(especie: Especies): EspecieResponse {
  return {
    id_especie: especie.id_especie,
    nome: especie.nome,
    nome_cientifico: especie.nome_cientifico,
    id_gruposespecies: especie.id_gruposespecies,
    pesquisador: especie.pesquisador,
    descricao: especie.descricao ?? null,
    ...stagingSpeciesMetadata(especie.id_especie),
    criado_em: especie.criado_em,
    atualizado_em: especie.atualizado_em ?? null,
    deletado_em: especie.deletado_em ?? null,

    informacoesEspecies: especie.informacoesEspecies?.map((informacao) => ({
      id_informacaoespecie: informacao.id_informacaoespecie,
      tipo_informacao: informacao.tipo_informacao,
      informacao: informacao.informacao,
      criado_em: informacao.criado_em,
      atualizado_em: informacao.atualizado_em ?? null,
      deletado_em: informacao.deletado_em ?? null,
    })),
  };
}

export function toEspecieListResponse(especie: Especies): EspecieListResponse {
  return {
    ...stagingSpeciesMetadata(especie.id_especie),
    id_especie: especie.id_especie,
    nome: especie.nome,
    nome_cientifico: especie.nome_cientifico,
    pesquisador: especie.pesquisador,
  };
}
