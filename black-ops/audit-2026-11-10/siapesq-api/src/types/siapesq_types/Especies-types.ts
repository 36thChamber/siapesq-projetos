import especies from "../../models/siapesq/Especies";

export type CriarEspeciesBody = {
  nome: string;
  nome_cientifico: string;
  id_gruposespecies: string;
  pesquisador: string;
  descricao?: string;
};

export type CriarEspeciesResponse = {
  id_especies: string;
  nome: string;
  nome_cientifico: string;
  id_gruposespecies: string;
  pesquisador: string;
  descricao?: string;
};

export type GetEspecieParamsRequest = {
  id: string;
};

export type GetEspeciesResponse = {
  id_especies: string;
  nome: string;
  nome_cientifico: string;
  id_gruposespecies: string;
  pesquisador: string;
  descricao: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date;

  informacoes: {
    id_informacaoespecie: string;
    tipo_informacao: string;
    informacao: string;
    fonte_referencia: string;
    link_fonte: string;
    criado_em: Date;
    atualizado_em: Date;
    deletado_em: Date;
  }[];
};

export type UpdateEspeciesBody = {
  id_especies: string;
  nome?: string;
  nome_cientifico?: string;
  id_gruposespecies?: string;
  pesquisador?: string;
  descricao?: string;
};

export type UpdateEspeciesResponse = {
  id_especies: string;
  nome: string;
  nome_cientifico: string;
  id_gruposespecies: string;
  pesquisador: string;
  descricao: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date;
};

export type DeleteEspeciesBody = {
  id_especies: string;
};

export type DeleteEspeciesResponse = {
  id_especies: string;
  deletado_em: Date;
};

export type ListarEspeciesQueryRequest = {
  limit: number;
  offset: number;
};
export type ListarEspeciesResponse = {
  especies: especies[];
  total: number;
};
