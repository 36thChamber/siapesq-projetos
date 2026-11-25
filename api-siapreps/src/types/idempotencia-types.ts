export type VerificarIdempotenciaParams = {
  chave: string;
  escopo: string;
  id_usuario: number;
  hashCorpo: string;
};

export type RegistrarIdempotenciaParams = {
  chave: string;
  escopo: string;
  id_usuario: number;
  hashCorpo: string;
  status: number;
  corpo: object;
};

export type ResultadoVerificacaoIdempotencia =
  | { tipo: "novo" }
  | { tipo: "replay"; status: number; corpo: object }
  | { tipo: "conflito" };
