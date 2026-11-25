import { User } from "./users";

export function mapUserFromApi(u: any): User {

  const validStatuses = ["APROVADO", "PENDENTE", "REPROVADO"];
  const safeStatus = validStatuses.includes(u.status) ? u.status : "PENDENTE";

  return {
    id: Number(u.id_usuario), // garante number
    nome: u.nome,
    email: u.email,
    contato: u.contato || "Não informado",
    tipo:
      u.tipo_usuario === "PESQUISADOR" || u.tipo_usuario === "PADRAO"
        ? u.tipo_usuario
        : "ADMIN",
    status: safeStatus,
  };
}