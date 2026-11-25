import InformacoesEspecies from "../models/InformacoesEspecies";

export type ArtigoInformacaoEspecieResponse = {
  id_artigo: number;
  referencia_texto: string | null;
  referencia_completa: string | null;
  nome_artigo: string | null;
};

export type InformacaoEspecieResponse = {
  id_informacaoespecies: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  artigos?: ArtigoInformacaoEspecieResponse[];
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarInformacaoEspecieBodyRequest = {
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  artigos_ids?: number[];
};

export type AtualizarInformacaoEspecieBodyRequest = {
  id_especie?: string;
  tipo_informacao?: string;
  informacao?: string;
  artigos_ids?: number[];
};

export type BuscarInformacaoEspeciePorIdParamsRequest = {
  id_informacaoespecies: string;
};

export type DeletarInformacaoEspecieParamsRequest = {
  id_informacaoespecies: string;
};

export type ListarInformacoesEspeciesQueryRequest = {
  limit?: number;
  offset?: number;
};

export type CriarInformacaoEspecieResponse = InformacaoEspecieResponse;
export type AtualizarInformacaoEspecieResponse = InformacaoEspecieResponse;
export type BuscarInformacaoEspeciePorIdResponse = InformacaoEspecieResponse;
export type DeletarInformacaoEspecieResponse = InformacaoEspecieResponse;

export type ListarInformacoesEspeciesResponse = {
  informacoesEspecies: InformacaoEspecieResponse[];
  total: number;
};

export function toInformacaoEspecieResponse(
  informacaoEspecie: InformacoesEspecies & { artigos?: any[] }
): InformacaoEspecieResponse {
  return {
    id_informacaoespecies: informacaoEspecie.id_informacaoespecie,
    id_especie: informacaoEspecie.id_especie,
    tipo_informacao: informacaoEspecie.tipo_informacao,
    informacao: informacaoEspecie.informacao,
    artigos: informacaoEspecie.artigos?.map((artigo) => ({
      id_artigo: artigo.id_artigo,
      referencia_texto: artigo.referencia_texto ?? null,
      referencia_completa: artigo.referencia_completa ?? null,
      nome_artigo: artigo.nome_artigo ?? null,
    })),
    criado_em: informacaoEspecie.criado_em,
    atualizado_em: informacaoEspecie.atualizado_em ?? null,
    deletado_em: informacaoEspecie.deletado_em ?? null,
  };
}