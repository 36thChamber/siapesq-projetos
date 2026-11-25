import {
  AtualizarRelatorioBodyRequest,
  CriarRelatorioBodyRequest,
  ListarRelatoriosQueryRequest,
  RelatorioActor,
  RelatorioIdParamsRequest,
  RelatorioRelacionamentoParamsRequest,
} from "../types/relatorios-types";
import httpStatus from "../consts/http-status-enum";
import Embarcacoes from "../models/Embarcacoes";
import Missoes from "../models/Missoes";
import Usuarios from "../models/Usuarios";
import BuscarRelatorioPorIdUseCase from "../use-cases/relatorios/buscar-relatorios-por-id";
import AtualizarRelatorioUseCase from "../use-cases/relatorios/atualizar-relatorios";
import BuscarRelatoriosUseCase from "../use-cases/relatorios/buscar-relatorios";
import BuscarRelatoriosPorEmbarcacaoUseCase from "../use-cases/relatorios/buscar-relatorios-por-embarcacao";
import BuscarRelatoriosPorMissaoUseCase from "../use-cases/relatorios/buscar-relatorios-por-missao";
import BuscarRelatoriosPorUsuarioUseCase from "../use-cases/relatorios/buscar-relatorios-por-usuario";
import CriarRelatorioUseCase from "../use-cases/relatorios/criar-relatorios";
import DeletarRelatorioUseCase from "../use-cases/relatorios/deletar-relatorios";

export async function validaUsuarioExiste(idUsuario: number): Promise<Usuarios> {
  const usuario = await Usuarios.findByPk(idUsuario);
  if (!usuario) {
    throw {
      message: `Usuário ${idUsuario} não encontrado`,
      status: httpStatus.NOT_FOUND,
    };
  }
  return usuario;
}

export async function validaEmbarcacaoExiste(idEmbarcacao: number): Promise<Embarcacoes> {
  const embarcacao = await Embarcacoes.findByPk(idEmbarcacao);
  if (!embarcacao) {
    throw {
      message: `Embarcação ${idEmbarcacao} não encontrada`,
      status: httpStatus.NOT_FOUND,
    };
  }
  return embarcacao;
}

export async function validaMissaoExiste(idMissao: number): Promise<Missoes> {
  const missao = await Missoes.findByPk(idMissao);
  if (!missao || missao.deletado_em) {
    throw {
      message: `Missão ${idMissao} não encontrada`,
      status: httpStatus.NOT_FOUND,
    };
  }
  return missao;
}

function pertenceAoAtor(dono: unknown, idUsuario: number): boolean {
  return Number(dono) === Number(idUsuario);
}

async function validaRelacionamentos(
  body: AtualizarRelatorioBodyRequest,
  actor: RelatorioActor,
) {
  if (body.id_usuario !== undefined) {
    await validaUsuarioExiste(body.id_usuario);
  }
  if (body.id_embarcacao !== undefined) {
    const embarcacao = await validaEmbarcacaoExiste(body.id_embarcacao);
    // Não-admin só pode vincular embarcações das quais é mestre. A resposta é
    // 404 para não revelar a existência de recurso de terceiro.
    if (!actor.administracao && !pertenceAoAtor(embarcacao.id_mestre, actor.id_usuario)) {
      throw {
        message: `Embarcação ${body.id_embarcacao} não encontrada`,
        status: httpStatus.NOT_FOUND,
      };
    }
  }
  if (body.id_missao !== undefined) {
    const missao = await validaMissaoExiste(body.id_missao);
    if (!actor.administracao && !pertenceAoAtor(missao.id_usuario, actor.id_usuario)) {
      throw {
        message: `Missão ${body.id_missao} não encontrada`,
        status: httpStatus.NOT_FOUND,
      };
    }
  }
}

/**
 * Para não-admin a consulta é restrita ao próprio `id_usuario`; admin mantém
 * a visão completa. O filtro é enviado ao banco, não aplicado após a leitura.
 */
function escopoDe(actor: RelatorioActor): number | undefined {
  return actor.administracao ? undefined : actor.id_usuario;
}

export default class RelatoriosServices {
  static async get(params: RelatorioIdParamsRequest) {
    await BuscarRelatorioPorIdUseCase.valida(params);
    return BuscarRelatorioPorIdUseCase.executa(params);
  }

  static async list(query: ListarRelatoriosQueryRequest, actor: RelatorioActor) {
    await BuscarRelatoriosUseCase.valida(query);
    return BuscarRelatoriosUseCase.executa(query, escopoDe(actor));
  }

  static async listByUsuario(
    params: RelatorioRelacionamentoParamsRequest,
    query: ListarRelatoriosQueryRequest,
    actor: RelatorioActor,
  ) {
    await BuscarRelatoriosPorUsuarioUseCase.valida(params, query);
    return BuscarRelatoriosPorUsuarioUseCase.executa(params, query, escopoDe(actor));
  }

  static async listByEmbarcacao(
    params: RelatorioRelacionamentoParamsRequest,
    query: ListarRelatoriosQueryRequest,
    actor: RelatorioActor,
  ) {
    await BuscarRelatoriosPorEmbarcacaoUseCase.valida(params, query);
    return BuscarRelatoriosPorEmbarcacaoUseCase.executa(params, query, escopoDe(actor));
  }

  static async listByMissao(
    params: RelatorioRelacionamentoParamsRequest,
    query: ListarRelatoriosQueryRequest,
    actor: RelatorioActor,
  ) {
    await BuscarRelatoriosPorMissaoUseCase.valida(params, query);
    return BuscarRelatoriosPorMissaoUseCase.executa(params, query, escopoDe(actor));
  }

  static async create(body: CriarRelatorioBodyRequest, actor: RelatorioActor) {
    await CriarRelatorioUseCase.valida(body);

    // A identidade do relatório é sempre a do token para não-admin. O body
    // nunca define titularidade nesse caso.
    const dados: CriarRelatorioBodyRequest = actor.administracao
      ? body
      : { ...body, id_usuario: actor.id_usuario };

    await validaRelacionamentos(dados, actor);
    return CriarRelatorioUseCase.executa(dados);
  }

  static async update(
    params: RelatorioIdParamsRequest,
    body: AtualizarRelatorioBodyRequest,
    actor: RelatorioActor,
  ) {
    await AtualizarRelatorioUseCase.valida(params, body);

    // Não-admin não altera a titularidade, mesmo que envie o próprio id.
    const dados: AtualizarRelatorioBodyRequest = { ...body };
    if (!actor.administracao) {
      delete dados.id_usuario;
    }

    await validaRelacionamentos(dados, actor);
    return AtualizarRelatorioUseCase.executa(params, dados);
  }

  static async delete(params: RelatorioIdParamsRequest) {
    await DeletarRelatorioUseCase.valida(params);
    return DeletarRelatorioUseCase.executa(params);
  }
}
