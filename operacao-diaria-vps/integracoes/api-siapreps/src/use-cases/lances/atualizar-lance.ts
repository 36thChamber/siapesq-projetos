import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Lances from "../../models/Lances";
import { AtualizarLanceBodyRequest, GetLanceParamsRequest } from "../../types/Lances-types";
import { AppError } from "../../errors/app-error";

// Schema: rejeita campos extras e exige pelo menos um campo
const updateBodySchema = Joi.object({
  numero_lance: Joi.number().optional(),
  id_fundo: Joi.number().allow(null).optional(),
  id_isca: Joi.number().allow(null).optional(),
  latitude_lancamento: Joi.string().optional(),
  longitude_lancamento: Joi.string().optional(),
  latitude_recolhimento: Joi.string().allow(null).optional(),
  longitude_recolhimento: Joi.string().allow(null).optional(),
  dados_especificos: Joi.object().allow(null).optional(),
  ativo: Joi.boolean().optional(),
})
  .min(1) // pelo menos um campo
  .unknown(false); // rejeita campos não listados (ex: id_missao, lancado_em, status, recolhido_em)

const paramsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  versaoEsperada: Joi.number().integer().required()
    .error(() => new Error("If-Match ou campo versao é obrigatório para esta operação")),
});

export default class AtualizarLanceUseCase {
  static async valida(params: GetLanceParamsRequest, body: AtualizarLanceBodyRequest) {
    try {
      await paramsSchema.validateAsync(params);
      await updateBodySchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    // Verifica se o lance existe
    const lance = await Lances.findByPk(params.id);
    if (!lance || !lance.ativo) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Lance não encontrado");
    }
  }

  static async executa(params: GetLanceParamsRequest, body: AtualizarLanceBodyRequest) {
    const lance = await Lances.findByPk(params.id);
    if (!lance || !lance.ativo) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Lance não encontrado");
    }

    const [rowsUpdated, [lanceAtualizado]] = await Lances.update(
      { ...body, versao: lance.versao + 1 },
      { where: { id: params.id, versao: params.versaoEsperada }, returning: true },
    );

    if (rowsUpdated === 0) {
      const atual = await Lances.findByPk(params.id);
      if (!atual || !atual.ativo) {
        throw { status: http_status.NOT_FOUND, message: "Lance não encontrado" };
      }
      throw {
        status: http_status.CONFLICT,
        message: "Versão desatualizada",
        code: "VERSION_MISMATCH",
      };
    }

    return lanceAtualizado;
  }
}