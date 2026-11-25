import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Lances from "../../models/Lances";
import { LanceStatus } from "../../models/enums/lance-status.enum";
import { AppError } from "../../errors/app-error";
import { parseObservedTimestamp, timestampObservadoSchema } from "../../utils/observed-timestamp";
import { Transaction } from "sequelize";

const paramsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  versaoEsperada: Joi.number().integer().required()
    .error(() => new Error("If-Match ou campo versao é obrigatório para esta operação")),
  recolhido_em_observado: timestampObservadoSchema(Joi).optional(),
});

export default class RecolherLanceUseCase {
  static async valida(params: { id: number; versaoEsperada: number }) {
    try {
      await paramsSchema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    const { id } = params;

    const lance = await Lances.findOne({
      where: { id, ativo: true },
    });

    if (!lance) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Lance ${id} não encontrado`);
    }

    if (lance.status !== LanceStatus.EM_ANDAMENTO) {
      throw new AppError(http_status.CONFLICT, 'BID_NOT_IN_PROGRESS', "Lance não está em andamento para ser recolhido");
    }

    (params as any).lance = lance;
  }

  static async executa(params: { id: number; versaoEsperada: number; recolhido_em_observado?: string }, transaction?: Transaction) {
    const { id, versaoEsperada } = params;
    const lanceAtual = (params as any).lance ?? (await Lances.findByPk(id));

    const recolhidoEmObservado = params.recolhido_em_observado
      ? parseObservedTimestamp(params.recolhido_em_observado)
      : null;
    if (recolhidoEmObservado && recolhidoEmObservado.getTime() < new Date(lanceAtual.lancado_em).getTime()) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', "recolhido_em_observado não pode ser anterior a lancado_em");
    }
    const [rowsUpdated, [lanceAtualizado]] = await Lances.update(
      {
        status: LanceStatus.RECOLHIDO,
        recolhido_em: recolhidoEmObservado ?? new Date(),
        recolhido_em_observado: recolhidoEmObservado,
        atualizado_em: new Date(),
        versao: lanceAtual.versao + 1,
      },
      {
        where: { id, versao: versaoEsperada },
        returning: true,
        transaction,
      }
    );

    if (rowsUpdated === 0) {
      const atual = await Lances.findByPk(id);
      if (!atual || !atual.ativo) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Lance ${id} não encontrado`);
      }
      throw new AppError(http_status.CONFLICT, 'VERSION_MISMATCH', "Versão desatualizada");
    }

    return lanceAtualizado;
  }
}
