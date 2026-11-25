import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import OcorrenciasLance, {
  TIPOS_OCORRENCIA_LANCE,
} from "../../models/OcorrenciasLance";
import {
  AtualizarOcorrenciaLanceBodyRequest,
  AtualizarOcorrenciaLanceResponse,
  GetOcorrenciaLanceParamsRequest,
  toOcorrenciaLanceResponse,
} from "../../types/ocorrencias-lance-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .error(() => new Error("id da ocorrência inválido")),
  versaoEsperada: Joi.number().integer().required()
    .error(() => new Error("If-Match ou campo versao é obrigatório para esta operação")),
});

const update_body_schema = Joi.object({
  id_especie: Joi.number()
    .integer()
    .positive()
    .error(() => new Error("id da espécie inválido")),
  tipo_ocorrencia: Joi.string()
    .valid(...TIPOS_OCORRENCIA_LANCE)
    .error(() => new Error("tipo_ocorrencia inválido")),
  quantidade: Joi.number()
    .integer()
    .min(0)
    .allow(null)
    .error(() => new Error("quantidade inválida")),
  quantidade_vivos: Joi.number()
    .integer()
    .min(0)
    .allow(null)
    .error(() => new Error("quantidade_vivos inválida")),
  quantidade_mortos: Joi.number()
    .integer()
    .min(0)
    .allow(null)
    .error(() => new Error("quantidade_mortos inválida")),
  peso: Joi.number()
    .min(0)
    .allow(null)
    .error(() => new Error("peso inválido")),
  observacao: Joi.string()
    .allow(null, "")
    .error(() => new Error("observacao inválida")),
})
  .min(1)
  .error(() => new Error("Nenhum campo informado para atualizar a ocorrência"));

export default class AtualizarOcorrenciaLanceUseCase {
  static async valida(
    params: GetOcorrenciaLanceParamsRequest,
    body: AtualizarOcorrenciaLanceBodyRequest,
  ) {
    try {
      await req_params_schema.validateAsync(params);
      await update_body_schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    // Validação de consistência: se todos os três campos forem fornecidos e não forem null
    if (
      body.quantidade !== undefined &&
      body.quantidade !== null &&
      body.quantidade_vivos !== undefined &&
      body.quantidade_vivos !== null &&
      body.quantidade_mortos !== undefined &&
      body.quantidade_mortos !== null
    ) {
      if (body.quantidade !== body.quantidade_vivos + body.quantidade_mortos) {
        throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', "quantidade deve ser igual a quantidade_vivos + quantidade_mortos");
      }
    }
  }

  static async executa(
    params: GetOcorrenciaLanceParamsRequest,
    body: AtualizarOcorrenciaLanceBodyRequest,
  ): Promise<AtualizarOcorrenciaLanceResponse> {
    try {
      const { id } = params;
      const ocorrencia = await OcorrenciasLance.findByPk(id);
      if (!ocorrencia) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Ocorrência ${id} não encontrada`);
      }

      const updateData = {
        id_especie: body.id_especie,
        tipo_ocorrencia: body.tipo_ocorrencia,
        quantidade: body.quantidade,
        quantidade_vivos: body.quantidade_vivos,
        quantidade_mortos: body.quantidade_mortos,
        peso: body.peso,
        observacao: body.observacao,
      };

      Object.keys(updateData).forEach((key) => {
        const field = key as keyof typeof updateData;
        if (updateData[field] === undefined) {
          delete updateData[field];
        }
      });

      const patch = { ...updateData, versao: ocorrencia.versao + 1 };
      const [rowsUpdated] = await OcorrenciasLance.update(patch, {
        where: { id, versao: params.versaoEsperada },
        fields: Object.keys(patch),
      });

      if (rowsUpdated === 0) {
        const atual = await OcorrenciasLance.findByPk(id);
        if (!atual) {
          throw {
            message: `Ocorrência ${id} não encontrada`,
            status: http_status.NOT_FOUND,
          };
        }
        throw {
          message: "Versão desatualizada",
          status: http_status.CONFLICT,
          code: "VERSION_MISMATCH",
        };
      }

      const ocorrenciaAtualizada = await OcorrenciasLance.findByPk(id);
      if (!ocorrenciaAtualizada) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Ocorrência ${id} não encontrada`);
      }

      return toOcorrenciaLanceResponse(ocorrenciaAtualizada);
    } catch (err) {
      throw err;
    }
  }
}