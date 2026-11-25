import ConfirmarPagamentoUseCase from "../use-cases/pagamentos/confirmar-pagamentos";
import FalharPagamentoUseCase from "../use-cases/pagamentos/falhar-pagamentos";
import BuscarPagamentoPorIdUseCase from "../use-cases/pagamentos/buscar-pagamento-por-id";
import BuscarPagamentosPorAssinaturaUseCase from "../use-cases/pagamentos/buscar-pagamentos-por-assinatura";
import BuscarPagamentosPorUsuarioUseCase from "../use-cases/pagamentos/buscar-pagamentos-por-usuario";
import ListarPagamentosUseCase from "../use-cases/pagamentos/buscar-pagamentos";
import CriarPagamentoUseCase from "../use-cases/pagamentos/criar-pagamento";
import ReembolsarPagamentoUseCase from "../use-cases/pagamentos/reembolsar-pagamento";

import {
  BuscarPagamentoPorIdParamsRequest,
  BuscarPagamentosPorAssinaturaParamsRequest,
  BuscarPagamentosPorUsuarioParamsRequest,
  ConfirmarPagamentoBodyRequest,
  CriarPagamentoBodyRequest,
  ListarPagamentosQueryRequest,
} from "../types/pagamentos-types";

import { AtorAutenticado } from "../utils/autorizacao-recurso";

export default class PagamentosService {
  static async buscarPorId(
    params: BuscarPagamentoPorIdParamsRequest,
    ator: AtorAutenticado
  ) {
    return BuscarPagamentoPorIdUseCase.executa(params, ator);
  }

  static async listar(query: ListarPagamentosQueryRequest, ator: AtorAutenticado) {
    return ListarPagamentosUseCase.executa(query, ator);
  }

  static async criar(body: CriarPagamentoBodyRequest, ator: AtorAutenticado) {
    return CriarPagamentoUseCase.executa(body, ator);
  }

  static async buscarPorUsuario(
    params: BuscarPagamentosPorUsuarioParamsRequest,
    ator: AtorAutenticado
  ) {
    return BuscarPagamentosPorUsuarioUseCase.executa(params, ator);
  }

  static async buscarPorAssinatura(
    params: BuscarPagamentosPorAssinaturaParamsRequest,
    ator: AtorAutenticado
  ) {
    return BuscarPagamentosPorAssinaturaUseCase.executa(params, ator);
  }

  static async confirmar(
    params: BuscarPagamentoPorIdParamsRequest,
    body: ConfirmarPagamentoBodyRequest,
    ator: AtorAutenticado
  ) {
    return ConfirmarPagamentoUseCase.executa(params, body, ator);
  }

  static async falhar(
    params: BuscarPagamentoPorIdParamsRequest,
    ator: AtorAutenticado
  ) {
    return FalharPagamentoUseCase.executa(params, ator);
  }

  static async reembolsar(
    params: BuscarPagamentoPorIdParamsRequest,
    ator: AtorAutenticado
  ) {
    return ReembolsarPagamentoUseCase.executa(params, ator);
  }
}