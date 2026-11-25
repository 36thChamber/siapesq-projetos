import type Missoes from "../models/Missoes";
import { MissaoStatus } from "../models/enums/missao-status.enum"; // assumindo que existe

// Criação: status inicial é rascunho, não deve ser enviado
export type CriarMissaoBodyRequest = {
  id_usuario: number;
  id_embarcacao: number;
  id_porto_saida: number;
  id_porto_chegada?: number | null;
  id_arte_pesca: number;
  id_especie_alvo?: number | null;
  nome_armador?: string | null;
  iniciou_em?: Date; // pode ser definido, mas service pode preencher
  terminou_em?: Date | null;
  client_record_id?: string;
  // status removido – será definido como 'rascunho' no service
};

// Atualização: campos imutáveis e status removidos
export type AtualizarMissaoBodyRequest = {
  id_porto_saida?: number;
  id_porto_chegada?: number | null;
  id_arte_pesca?: number;
  id_especie_alvo?: number | null;
  nome_armador?: string | null;
  iniciou_em?: Date;
  terminou_em?: Date | null;
  // id_usuario, id_embarcacao, status não permitidos
};

// Comandos explícitos
export type IniciarMissaoRequest = { iniciou_em_observado?: string };
export type FinalizarMissaoRequest = { terminou_em_observado?: string };

// Parâmetros e queries (mantidos)
export type GetMissaoParamsRequest = { id: number; versaoEsperada?: number };


export type ListarMissoesQueryRequest = {
  limit?: number;
  offset?: number;
  updated_after?: string;
  /** Restringe a listagem às missões deste usuário. */
  id_usuario?: number;
};
export type ListarMissoesPorUsuarioParamsRequest = { id_usuario: number };
export type ListarMissoesPorEmbarcacaoParamsRequest = { id_embarcacao: number };

// Resposta: inclui o enum no status
export type MissaoResponse = {
  id: number;
  id_usuario: number;
  id_embarcacao: number;
  id_porto_saida: number;
  id_porto_chegada: number | null;
  id_arte_pesca: number;
  id_especie_alvo: number | null;
  nome_armador: string | null;
  iniciou_em: Date;
  terminou_em: Date | null;
  iniciou_em_observado: Date | null;
  terminou_em_observado: Date | null;
  status: MissaoStatus | null; // agora com enum
  client_record_id: string;
  versao: number;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarMissaoResponse = MissaoResponse;
export type AtualizarMissaoResponse = MissaoResponse;
export type GetMissaoResponse = MissaoResponse;
export type DeleteMissaoResponse = MissaoResponse;
export type IniciarMissaoResponse = MissaoResponse;
export type FinalizarMissaoResponse = MissaoResponse;

export type ListarMissoesResponse = {
  missoes: MissaoResponse[];
  total: number;
};

export function toMissaoResponse(missao: Missoes): MissaoResponse {
  return {
    id: missao.id,
    id_usuario: missao.id_usuario,
    id_embarcacao: missao.id_embarcacao,
    id_porto_saida: missao.id_porto_saida,
    id_porto_chegada: missao.id_porto_chegada ?? null,
    id_arte_pesca: missao.id_arte_pesca,
    id_especie_alvo: missao.id_especie_alvo ?? null,
    nome_armador: missao.nome_armador ?? null,
    iniciou_em: missao.iniciou_em,
    terminou_em: missao.terminou_em ?? null,
    iniciou_em_observado: missao.iniciou_em_observado ?? null,
    terminou_em_observado: missao.terminou_em_observado ?? null,
    status: missao.status as MissaoStatus | null, // cast se necessário
    client_record_id: missao.client_record_id,
    versao: missao.versao,
    criado_em: missao.criado_em,
    atualizado_em: missao.atualizado_em ?? null,
    deletado_em: missao.deletado_em ?? null,
  };
}
