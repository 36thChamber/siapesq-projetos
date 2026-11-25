import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import {
  AtualizarRelatorioBodyRequest,
  CriarRelatorioBodyRequest,
  ListarRelatoriosQueryRequest,
  RelatorioIdParamsRequest,
  RelatorioRelacionamentoParamsRequest,
} from "../../types/relatorios-types";
import { AppError } from "../../errors/app-error";

const id = Joi.number().integer().positive();

const idParamsSchema = Joi.object({
  id: id.required(),
});

const relacionamentoParamsSchema = Joi.object({
  id_usuario: id,
  id_embarcacao: id,
  id_missao: id,
}).length(1);

const paginacaoSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).required(),
  offset: Joi.number().integer().min(0).required(),
});

const camposRelatorio = {
  id_usuario: id.required(),
  id_embarcacao: id.required(),
  id_missao: id.required(),
  uri: Joi.string().trim().min(1).max(2048).required(),
  tipo: Joi.string().trim().min(1).max(255).allow(null),
};

const criarRelatorioSchema = Joi.object(camposRelatorio);

const atualizarRelatorioSchema = Joi.object({
  id_usuario: Joi.number().integer().positive(),
  id_embarcacao: Joi.number().integer().positive(),
  id_missao: Joi.number().integer().positive(),
  uri: Joi.string().trim().min(1).max(2048),
  tipo: Joi.string().trim().min(1).max(255).allow(null),
}).min(1);

async function validar(schema: Joi.ObjectSchema, valor: unknown, mensagem: string) {
  try {
    await schema.validateAsync(valor, { abortEarly: true, convert: false });
  } catch {
    throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', mensagem);
  }
}

export function validarIdRelatorio(params: RelatorioIdParamsRequest) {
  return validar(idParamsSchema, params, "id do relatório inválido");
}

export function validarRelacionamentoRelatorio(params: RelatorioRelacionamentoParamsRequest) {
  return validar(relacionamentoParamsSchema, params, "id do relacionamento inválido");
}

export function validarPaginacaoRelatorios(query: ListarRelatoriosQueryRequest) {
  return validar(paginacaoSchema, query, "Parâmetros de paginação inválidos");
}

export function validarCriacaoRelatorio(body: CriarRelatorioBodyRequest) {
  return validar(criarRelatorioSchema, body, "Dados do relatório inválidos");
}

export function validarAtualizacaoRelatorio(body: AtualizarRelatorioBodyRequest) {
  return validar(atualizarRelatorioSchema, body, "Dados para atualização do relatório inválidos");
}