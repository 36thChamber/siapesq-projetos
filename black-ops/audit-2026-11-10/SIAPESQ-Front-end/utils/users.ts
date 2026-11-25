// src/utils/user.ts

export type UserStatus = "APROVADO" | "PENDENTE" | "REPROVADO";

export type UserType = "PESQUISADOR" | "ADMIN" | "PADRAO";

export const USER_TYPE_LABEL: Record<UserType, string> = {
  PESQUISADOR: "Pesquisador",
  ADMIN: "Administrador",
  PADRAO: "Usuário",
};

export interface User {
  id: number;
  nome: string;
  email: string;
  contato: string;
  tipo: UserType;
  status: UserStatus;
}