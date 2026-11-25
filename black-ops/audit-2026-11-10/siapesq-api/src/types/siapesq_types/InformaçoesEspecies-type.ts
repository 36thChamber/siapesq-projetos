import informacoesEspecies from "../../models/siapesq/InformacoesEspecies";

export type CriarInformaçoesEspeciesBody = {
  id_informacaoespecies: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_texto?: string;
  referencia_completa?: string;
};

export type CriarInformaçoesEspeciesResponse = {
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_texto?: string;
  referencia_completa?: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date;
};

export type GetInformacoesEspeciesParamsRequest = {
  id_informacaoespecies: string;
};

export type GetInformaçoesEspeciesResponse = {
  id_informacaoespecies: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_texto?: string;
  referencia_completa?: string;  
};

export type UpdateInformaçoesEspeciesBody = {
  id_informacaoespecies: string;
  id_Especie: string;
  tipo_informacao?: string;
  informacao?: string;
  fonte_referencia?: string;
  link_fonte?: string;
  referencia_texto?: string;
  referencia_completa?: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date;
};

export type UpdateInformaçoesEspeciesResponse = {
  id_informacaoespecies: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_texto?: string;
  referencia_completa?: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date;
};

export type DeleteInformacaoEspecie = {
  id_informacaoespecies: string;
};

export type ListarInformacoesEspeciesQueryRequest = {
  limit: number;
  offset: number;
};
export type ListarInformacoesEspeciesResponse = {
  informacoesEspecies: informacoesEspecies[];
  total: number;
};
