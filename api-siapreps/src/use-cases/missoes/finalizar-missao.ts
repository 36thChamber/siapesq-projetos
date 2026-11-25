import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Missoes from "../../models/Missoes";
import Lances from "../../models/Lances";
import { MissaoStatus } from "../../models/enums/missao-status.enum";
import { LanceStatus } from "../../models/enums/lance-status.enum";
import { AppError } from "../../errors/app-error";
import { parseObservedTimestamp, timestampObservadoSchema } from "../../utils/observed-timestamp";
import { Transaction } from "sequelize";

const paramsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  usuarioId: Joi.number().integer().positive().required(),
  versaoEsperada: Joi.number().integer().required()
    .error(() => new Error("If-Match ou campo versao é obrigatório para esta operação")),
  terminou_em_observado: timestampObservadoSchema(Joi).optional(),
});

export default class FinalizarMissaoUseCase {
  static async valida(params: { id: number; usuarioId: number; versaoEsperada: number }) {
    try {
      await paramsSchema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    const { id, usuarioId } = params;

    // 1. Verificar se a missão existe e pertence ao usuário
    const missao = await Missoes.findOne({
      where: { id, id_usuario: usuarioId },
    });

    if (!missao) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Missão não encontrada ou não pertence ao usuário");
    }

    // 2. Verificar se a missão está em_andamento
    if (missao.status !== MissaoStatus.EM_ANDAMENTO) {
      throw new AppError(http_status.CONFLICT, 'MISSION_NOT_IN_PROGRESS', "Missão não está em andamento para ser finalizada");
    }

    // 3. Verificar se não há lances em_andamento
    const lancesAbertos = await Lances.findOne({
      where: {
        id_missao: id,
        status: LanceStatus.EM_ANDAMENTO,
        ativo: true,
      },
    });

    if (lancesAbertos) {
      throw new AppError(http_status.CONFLICT, 'OPEN_BIDS_EXIST', "Existem lances em andamento. Recolha ou cancele todos antes de finalizar");
    }

    (params as any).missao = missao;
  }

  static async executa(params: { id: number; usuarioId: number; versaoEsperada: number; terminou_em_observado?: string }, transaction?: Transaction) {
    const { id, versaoEsperada } = params;
    const missaoAtual = (params as any).missao ?? (await Missoes.findByPk(id));

    const terminouEmObservado = params.terminou_em_observado
      ? parseObservedTimestamp(params.terminou_em_observado)
      : null;
    if (terminouEmObservado && terminouEmObservado.getTime() < new Date(missaoAtual.iniciou_em).getTime()) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', "terminou_em_observado não pode ser anterior a iniciou_em");
    }
    const [rowsUpdated, [missaoAtualizada]] = await Missoes.update(
      {
        status: MissaoStatus.FINALIZADA,
        terminou_em: terminouEmObservado ?? new Date(),
        terminou_em_observado: terminouEmObservado,
        atualizado_em: new Date(),
        versao: missaoAtual.versao + 1,
      },
      {
        where: { id, versao: versaoEsperada },
        returning: true,
        transaction,
      }
    );

    if (rowsUpdated === 0) {
      const atual = await Missoes.findByPk(id);
      if (!atual || atual.deletado_em) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Missão não encontrada");
      }
      throw new AppError(http_status.CONFLICT, 'VERSION_MISMATCH', "Versão desatualizada");
    }

    return missaoAtualizada;
  }
}
