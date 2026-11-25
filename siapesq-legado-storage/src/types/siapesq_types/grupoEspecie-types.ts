import gruposEspecies from "../../models/siapesq/GrupoEspecies";

export type CriarGrupoEspecieBody = {
  nome: string;
  quantidade: number;
};

export type CriarGrupoEspecieResponse = {
  id_gruposespecies: string;
  nome: string;
  quantidade: number;
};
export type GetGruposEspecieParamsRequest = {
  id: string;
};
export type GetGrupoEspecieResponse = {
  id_gruposespecies: string;
  nome: string;
  quantidade: number;
};

export type UpdateGrupoEspecieBody = {
  id_gruposespecies: string;
  quantidade: number;
};

export type UpdateGrupoEspecieResponse = {
  id_gruposespecies: string;
  quantidade: number;
};

export type ListarGruposEspeciesQueryRequest = {
  limit: number;
  offset: number;
};
export type ListarGruposEspeciesResponse = {
  gruposEspecies: gruposEspecies[];
  total: number;
};
