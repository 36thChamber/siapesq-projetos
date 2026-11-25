// types/grupoEspecie.types.ts

// --- PAYLOADS

export interface CriarGrupoEspeciePayload {
  nome: string;
  quantidade: number;
  descricao?: string;
}

// --- ENTIDADES 

// Representa um Grupo de Espécies igual ao model do backend
export interface GrupoEspecie {
  id_gruposespecies: string;
  nome: string;
  quantidade?: number;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
}

export type EspecieDoGrupo = {
  id: string;
  nome: string;
  nome_cientifico?: string;
  id_grupo_especie?: string;
};

export type Category = GrupoEspecie;
export type GrupoEspecies = GrupoEspecie;

export interface RespostaPaginadaGruposEspecies {
  total?: number;
  page?: number;
  limit?: number;
  data: GrupoEspecie[];
}

