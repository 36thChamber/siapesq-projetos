import AtivarAssinaturaUseCase from "../use-cases/assinaturas/ativar-assinatura";
import CancelarAssinaturaUseCase from "../use-cases/assinaturas/cancelar-assinatura";
import ExpirarAssinaturaUseCase from "../use-cases/assinaturas/expirar-assinatura";
import GetAssinaturaPorUsuarioUseCase from "../use-cases/assinaturas/buscar-assinatura-por-usuario";
import GetAssinaturaUseCase from "../use-cases/assinaturas/buscar-assinatura-por-id";
import ListarAssinaturasUseCase from "../use-cases/assinaturas/buscar-assinaturas";
import ListarAssinaturasAtivasUseCase from "../use-cases/assinaturas/buscar-assinaturas-ativas";
import CriarAssinaturaUseCase from "../use-cases/assinaturas/criar-assinatura";
import AtualizarAssinaturaUseCase from "../use-cases/assinaturas/atualizar-assinatura";
import {
  BuscarAssinaturaPorIdParamsRequest,
  AtualizarAssinaturaBodyRequest,
} from "../types/assinaturas-types";
import { AtorAutenticado } from "../utils/autorizacao-recurso";

export default class AssinaturasService {
  static async get(id_assinatura: string, ator: AtorAutenticado) {
    return await GetAssinaturaUseCase.executa({ id_assinatura }, ator);
  }

  static async getByUsuario(id_usuario: string, ator: AtorAutenticado) {
    return await GetAssinaturaPorUsuarioUseCase.executa({ id_usuario }, ator);
  }

  static async list(
    query: { limit: number; offset: number },
    ator: AtorAutenticado
  ) {
    return await ListarAssinaturasUseCase.executa(query, ator);
  }

  static async listAtivas(
    query: { limit: number; offset: number },
    ator: AtorAutenticado
  ) {
    return await ListarAssinaturasAtivasUseCase.executa(query, ator);
  }

  static async create(body: any, ator: AtorAutenticado) {
    return await CriarAssinaturaUseCase.executa(body, ator);
  }

  static async update(
    params: BuscarAssinaturaPorIdParamsRequest,
    body: AtualizarAssinaturaBodyRequest,
    ator: AtorAutenticado,
  ) {
    return AtualizarAssinaturaUseCase.executa(params, body, ator);
  }

  static async ativar(id: string, ator: AtorAutenticado) {
    return await AtivarAssinaturaUseCase.executa({ id_assinatura: id }, ator);
  }

  static async cancelar(id: string, ator: AtorAutenticado) {
    return await CancelarAssinaturaUseCase.executa({ id_assinatura: id }, ator);
  }

  static async expirar(id: string, ator: AtorAutenticado) {
    return await ExpirarAssinaturaUseCase.executa({ id_assinatura: id }, ator);
  }
}
