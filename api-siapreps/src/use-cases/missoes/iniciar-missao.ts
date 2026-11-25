import { Op } from "sequelize";
import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Missoes from "../../models/Missoes";
import Embarcacoes from "../../models/Embarcacoes";
import { MissaoStatus } from "../../models/enums/missao-status.enum";
import { AppError } from "../../errors/app-error";
import { parseObservedTimestamp, timestampObservadoSchema } from "../../utils/observed-timestamp";
import { Transaction } from "sequelize";

const paramsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  usuarioId: Joi.number().integer().positive().required(),
  versaoEsperada: Joi.number().integer().required()
    .error(() => new Error("If-Match ou campo versao é obrigatório para esta operação")),
  iniciou_em_observado: timestampObservadoSchema(Joi).optional(),
});

export default class IniciarMissaoUseCase {
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
      include: [{ model: Embarcacoes, as: "embarcacao" }],
    });

    if (!missao) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Missão não encontrada ou não pertence ao usuário");
    }

    // 2. Verificar se a missão está em rascunho
    if (missao.status !== MissaoStatus.RASCUNHO) {
      throw new AppError(http_status.CONFLICT, 'MISSION_NOT_IN_DRAFT', "Missão não está em rascunho para ser iniciada");
    }

    // 3. Verificar se a embarcação está ativa
    if (!missao.embarcacao || !missao.embarcacao.ativo) {
      throw new AppError(http_status.CONFLICT, 'VESSEL_NOT_ACTIVE', "Embarcação inativa ou não encontrada");
    }

    // 4. Verificar se não há outra missão em_andamento para a mesma embarcação
    const missaoEmAndamento = await Missoes.findOne({
      where: {
        id_embarcacao: missao.id_embarcacao,
        status: MissaoStatus.EM_ANDAMENTO,
        id: { [Op.ne]: id },
      },
    });

    if (missaoEmAndamento) {
      throw new AppError(http_status.CONFLICT, 'CONCURRENT_MISSION_ACTIVE', "Já existe uma missão em andamento para esta embarcação");
    }

    // Armazena a missão para uso no executa (evita consulta duplicada)
    (params as any).missao = missao;
  }

  static async executa(params: { id: number; usuarioId: number; versaoEsperada: number; iniciou_em_observado?: string }, transaction?: Transaction) {
    const { id, versaoEsperada } = params;
    const missaoAtual = (params as any).missao ?? (await Missoes.findByPk(id));

    const iniciouEmObservado = params.iniciou_em_observado
      ? parseObservedTimestamp(params.iniciou_em_observado)
      : null;
    const [rowsUpdated, [missaoAtualizada]] = await Missoes.update(
      {
        status: MissaoStatus.EM_ANDAMENTO,
        iniciou_em: iniciouEmObservado ?? new Date(),
        iniciou_em_observado: iniciouEmObservado,
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
