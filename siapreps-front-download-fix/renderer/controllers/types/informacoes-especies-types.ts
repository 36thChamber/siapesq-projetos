export type type_informacao_especie_model = {
  id_informacaoespecie: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_coompleta: string;
  referencia_texto: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date | null;
};

export type type_create_informacao_especie_body = {
  id_informacaoespecies?: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_coompleta: string;
  referencia_texto: string;
};

export type type_create_informacao_especie_response = {
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_coompleta: string;
  referencia_texto: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date | null;
};

export type type_get_id_informacao_especie_response = {
  id_informacaoespecies: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_coompleta: string;
  referencia_texto: string;
};

export type type_list_informacao_especie_query = {
  limit: number;
  offset: number;
};

export type type_list_informacao_especie_response = {
  informacoesEspecies: type_informacao_especie_model[];
  total: number;
};

export type type_update_informacao_especie_body = {
  id_informacaoespecies: string;
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_coompleta: string;
  referencia_texto: string;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date | null;
};

export type type_update_informacao_especie_response =
  type_informacao_especie_model;

export type type_delete_informacao_especie_response = {
  id_informacaoespecies: string;
  deletado_em: Date;
};
