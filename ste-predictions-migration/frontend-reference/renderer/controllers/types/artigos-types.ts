export type Artigo = {
  id_artigo: number;
  artigo: string;
  referencia_texto: string;
  referencia_completa: string;
  link_drive: string | null;
  id_especie: string | null;
  nome_especie: string | null;
  nome_artigo:  string | null;
};

export type type_list_artigos_response = {
  artigos: Artigo[];
  total: number;
};


export type type_list_artigos_query = {
  limit?: number;
  offset?: number;
};

export type ArtigosPorEspecie = {
  id_especie: string;
  nome_especie: string;
  artigos: Artigo[];
};

export type type_artigo_response = {
  id_artigo: number;
  id_especie: string;
  nome_especie: string;
  nome_artigo: string;
  artigo: string;
  referencia_texto: string;
  referencia_completa: string;
  link_drive: string;
};
