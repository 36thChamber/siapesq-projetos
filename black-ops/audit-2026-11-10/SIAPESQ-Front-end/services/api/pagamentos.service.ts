// services/api/pagamentos.service.ts
import { get, post, patch } from "@/services/api/apiClient";
import {
  UUID,
  Pagamento,
  CriarPagamentoPayload,
  CriarPagamentoDTO,
  GetPagamentoResponse,
} from "@/services/types/pagamento.types";

export async function getPagamentos(): Promise<Pagamento[]> {
  try {
    return await get<Pagamento[]>("/pagamentos");
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar pagamentos.",
    );
  }
}

export async function createPagamento(
  data: CriarPagamentoPayload,
): Promise<Pagamento> {
  try {
    return await post<Pagamento, CriarPagamentoPayload>(
      "/pagamentos",
      data,
    );
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao criar pagamento.",
    );
  }
}

export async function getPagamentosUsuario(
  idUsuario: UUID,
): Promise<Pagamento[]> {
  try {
    return await get<Pagamento[]>(`/pagamentos/usuario/${idUsuario}`);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar pagamentos do usuário.",
    );
  }
}

export async function getPagamentosAssinatura(
  idAssinatura: UUID,
): Promise<Pagamento[]> {
  try {
    return await get<Pagamento[]>(
      `/pagamentos/assinatura/${idAssinatura}`,
    );
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Erro ao buscar pagamentos da assinatura.",
    );
  }
}

export async function getPagamentoById(
  id: UUID,
): Promise<Pagamento> {
  try {
    return await get<Pagamento>(`/pagamentos/${id}`);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar pagamento.",
    );
  }
}

export async function confirmarPagamento(
  id: UUID,
) {
  try {
    return await patch<any>(`/pagamentos/${id}/confirmar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao confirmar pagamento.",
    );
  }
}

export async function falharPagamento(
  id: UUID,
) {
  try {
    return await patch<any>(`/pagamentos/${id}/falhar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao falhar pagamento.",
    );
  }
}

export async function reembolsarPagamento(
  id: UUID,
) {
  try {
    return await patch<any>(`/pagamentos/${id}/reembolsar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao reembolsar pagamento.",
    );
  }
}

export type { UUID, CriarPagamentoDTO, GetPagamentoResponse };
