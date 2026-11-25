// renderer/controllers/types/analises-types.ts

export type type_arquivos_incerteza_analise = {
  nacional_incerteza?: string | null;
  nacional_ssp245_incerteza?: string | null;
  rs_ssp245_incerteza?: string | null;
  rs_ssp585_incerteza?: string | null;
  poligono_ssp245_incerteza?: string | null;
  poligono_ssp585_incerteza?: string | null;
  rs_incerteza?: string | null;
  poligono_incerteza?: string | null;
};

export type type_register_analise = {
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string | null; // opcional no body [web:31][web:39]
  nome_arquivo_nacional?: string | null;
  nome_arquivo_otimista?: string | null;
  nome_arquivo_pessimista?: string | null;
  nome_arquivo_30_otimista?: string | null;
  nome_arquivo_30_pessimista?: string | null;
  nome_arquivo_rs_otimista?: string | null;
  nome_arquivo_rs_pessimista?: string | null;
} & type_arquivos_incerteza_analise;

export type type_register_analise_response = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30: string | null; // sempre vem do backend, pode ser null [web:76]
  nome_arquivo_nacional?: string | null;
  nome_arquivo_otimista?: string | null;
  nome_arquivo_pessimista?: string | null;
  nome_arquivo_30_otimista?: string | null;
  nome_arquivo_30_pessimista?: string | null;
  nome_arquivo_rs_otimista?: string | null;
  nome_arquivo_rs_pessimista?: string | null;
} & type_arquivos_incerteza_analise;

export type type_get = {
  id_analise: string;
};

export type type_get_response = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string | null;
  nome_arquivo_nacional?: string | null;
  nome_arquivo_otimista?: string | null;
  nome_arquivo_pessimista?: string | null;
  nome_arquivo_30_otimista?: string | null;
  nome_arquivo_30_pessimista?: string | null;
  nome_arquivo_rs_otimista?: string | null;
  nome_arquivo_rs_pessimista?: string | null;
} & type_arquivos_incerteza_analise;

export type type_update = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string | null; // opcional no update [web:31][web:39]
  nome_arquivo_nacional?: string | null;
  nome_arquivo_otimista?: string | null;
  nome_arquivo_pessimista?: string | null;
  nome_arquivo_30_otimista?: string | null;
  nome_arquivo_30_pessimista?: string | null;
  nome_arquivo_rs_otimista?: string | null;
  nome_arquivo_rs_pessimista?: string | null;
} & type_arquivos_incerteza_analise;

export type type_update_response = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30: string | null;
  nome_arquivo_nacional?: string | null;
  nome_arquivo_otimista?: string | null;
  nome_arquivo_pessimista?: string | null;
  nome_arquivo_30_otimista?: string | null;
  nome_arquivo_30_pessimista?: string | null;
  nome_arquivo_rs_otimista?: string | null;
  nome_arquivo_rs_pessimista?: string | null;
} & type_arquivos_incerteza_analise;

export type type_delete = {
  id_analise: string;
};

export type type_delete_response = {
  id_analise: string;
};

export type type_list_analises = {
  limit: number;
  offset: number;
};

export type type_list_analises_response = {
  analises: type_register_analise_response[];
  total: number;
};
