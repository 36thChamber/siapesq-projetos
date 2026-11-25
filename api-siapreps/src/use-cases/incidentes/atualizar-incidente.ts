import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Incidentes, { GrupoIncidente } from "../../models/Incidentes";
import Missoes from "../../models/Missoes";
import { AtualizarIncidenteBodyRequest } from "../../types/incidentes-types";
import { AppError } from "../../errors/app-error";

const paramsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  usuarioId: Joi.number().integer().positive().required(),
  versaoEsperada: Joi.number().integer().required()
    .error(() => new Error("If-Match ou campo versao é obrigatório para esta operação")),
});

const bodySchema = Joi.object({
  grupo: Joi.string()
    .valid(...Object.values(GrupoIncidente))
    .optional(),
  quantidade_vivos: Joi.number().integer().min(0).optional(),
  quantidade_mortos: Joi.number().integer().min(0).optional(),
  observacao: Joi.string().max(2000).allow(null).optional(),
}).min(1);

export default class AtualizarIncidenteUseCase {
  static async valida(params: {
    id: number;
    usuarioId: number;
    versaoEsperada: number;
    dados: AtualizarIncidenteBodyRequest;
  }) {
    const { id, usuarioId, versaoEsperada, dados } = params;

    try {
      await paramsSchema.validateAsync({ id, usuarioId, versaoEsperada });
      await bodySchema.validateAsync(dados);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    const incidente = await Incidentes.findOne({
      where: { id, deletado_em: null },
      include: [
        { model: Missoes, as: "missao", where: { id_usuario: usuarioId } },
      ],
    });

    if (!incidente) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Incidente não encontrado ou não pertence ao usuário");
    }

    (params as any).incidente = incidente;
  }

  static async executa(params: {
    id: number;
    versaoEsperada: number;
    dados: AtualizarIncidenteBodyRequest;
  }) {
    const { id, versaoEsperada, dados } = params;
    const incidenteAtual = (params as any).incidente ?? (await Incidentes.findByPk(id));

    const updateData: Record<string, any> = {
      atualizado_em: new Date(),
      versao: incidenteAtual.versao + 1,
    };

    const allowedFields: (keyof AtualizarIncidenteBodyRequest)[] = [
      "grupo",
      "quantidade_vivos",
      "quantidade_mortos",
      "observacao",
    ];

    for (const field of allowedFields) {
      if (dados[field] !== undefined) {
        updateData[field] = dados[field];
      }
    }

    const [rowsUpdated, [incidenteAtualizado]] = await Incidentes.update(
      updateData,
      {
        where: { id, versao: versaoEsperada },
        returning: true,
      }
    );

    if (rowsUpdated === 0) {
      const atual = await Incidentes.findByPk(id);
      if (!atual || atual.deletado_em) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Incidente não encontrado");
      }
      throw new AppError(http_status.CONFLICT, 'VERSION_MISMATCH', "Versão desatualizada");
    }

    return incidenteAtualizado;
  }
}