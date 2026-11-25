import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import Alertas from "../../models/Alertas";
import AreasAlertas from "../../models/AreasAlertas";
import Reservatorios from "../../models/Reservatorios";
import Usuarios from "../../models/Usuarios";
import {
  CriarAlertaBodyRequest,
  CriarAlertaBulkBodyRequest,
  CriarAlertaResponse,
  toAlertaResponse,
} from "../../types/alertas-types";

const create_body_schema = Joi.object({
  id_usuario: Joi.number()
    .optional()
    .allow(null)
    .error(() => new Error("id_usuario deve ser um número válido")),

  id_reservatorio: Joi.number()
    .required()
    .error(() => new Error("id_reservatorio é obrigatório e deve ser um número")),

  id_area_alerta: Joi.number()
    .required()
    .error(() => new Error("id_area_alerta é obrigatório e deve ser um número")),

  tipo: Joi.string()
    .required()
    .valid("NDCI", "TSI", "ALGAS", "MACROFITAS")
    .error(() => new Error("tipo deve ser NDCI, TSI, ALGAS ou MACROFITAS")),

  nivel: Joi.string()
    .optional()
    .allow(null)
    .error(() => new Error("nivel deve ser uma string válida")),

  titulo: Joi.string()
    .optional()
    .allow(null, "")
    .error(() => new Error("titulo deve ser uma string válida")),

  descricao: Joi.string()
    .optional()
    .allow(null, "")
    .error(() => new Error("descricao deve ser uma string válida")),

  data_analise: Joi.date()
    .required()
    .error(() => new Error("data_analise é obrigatória e deve ser uma data válida")),

  data_alerta: Joi.date()
    .optional()
    .allow(null)
    .error(() => new Error("data_alerta deve ser uma data válida")),

  percentual_principal: Joi.number()
    .optional()
    .allow(null)
    .error(() => new Error("percentual_principal deve ser um número válido")),

  total_pixels: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .error(() => new Error("total_pixels deve ser um número inteiro válido")),

  detalhes: Joi.object()
    .optional()
    .allow(null)
    .error(() => new Error("detalhes deve ser um objeto válido")),

  status: Joi.string()
    .optional()
    .valid("novo", "visualizado", "resolvido", "ignorado")
    .error(() => new Error("status deve ser novo, visualizado, resolvido ou ignorado")),

  visualizado: Joi.boolean()
    .optional()
    .error(() => new Error("visualizado deve ser booleano")),
});

const bulk_body_schema = Joi.object({
  alertas: Joi.array()
    .items(create_body_schema)
    .min(1)
    .required()
    .error(() => new Error("alertas deve ser um array com pelo menos um item")),
});

export default class CriarAlertaUseCase {
  static async valida(body: CriarAlertaBodyRequest) {
    try {
      await create_body_schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async validaBuik(body: CriarAlertaBulkBodyRequest) {
    try {
      await bulk_body_schema.validateAsync(body);
      return body.alertas;
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  private static async validarReservatorio(id_reservatorio: number): Promise<Reservatorios> {
    const reservatorio = await Reservatorios.findByPk(id_reservatorio);

    if (!reservatorio) {
      throw {
        message: "Reservatório não encontrado",
        status: http_status.NOT_FOUND,
      };
    }

    return reservatorio;
  }

  private static async validarAreaAlerta(
    id_area_alerta: number,
    id_reservatorio: number
  ): Promise<void> {
    const areaAlerta = await AreasAlertas.findOne({
      where: {
        id: id_area_alerta,
        id_reservatorio,
      },
    });

    if (!areaAlerta) {
      throw {
        message: "Área de alerta não encontrada para este reservatório",
        status: http_status.NOT_FOUND,
      };
    }
  }

  private static async validarUsuario(id_usuario?: number | null): Promise<void> {
    if (!id_usuario) return;

    const usuario = await Usuarios.findByPk(id_usuario);

    if (!usuario) {
      throw {
        message: "Usuário não encontrado",
        status: http_status.NOT_FOUND,
      };
    }
  }

  private static async validarDuplicidade(
    id_reservatorio: number,
    id_area_alerta: number,
    tipo: string,
    data_analise: Date | string
  ): Promise<void> {
    const alertaExistente = await Alertas.findOne({
      where: {
        id_reservatorio,
        id_area_alerta,
        tipo,
        data_analise,
      },
    });

    if (alertaExistente) {
      throw {
        message: "Já existe alerta para este reservatório, área, tipo e data de análise",
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: CriarAlertaBodyRequest
  ): Promise<CriarAlertaResponse> {
    const alerta = {
      id_usuario: body.id_usuario ?? null,
      id_reservatorio: body.id_reservatorio,
      id_area_alerta: body.id_area_alerta,
      tipo: body.tipo,
      nivel: body.nivel ?? null,
      titulo: body.titulo ?? null,
      descricao: body.descricao ?? null,
      data_analise: body.data_analise,
      data_alerta: body.data_alerta ?? new Date(),
      percentual_principal: body.percentual_principal ?? null,
      total_pixels: body.total_pixels ?? null,
      detalhes: body.detalhes ?? null,
      status: body.status ?? "novo",
      visualizado: body.visualizado ?? false,
    };

    const reservatorio = await this.validarReservatorio(alerta.id_reservatorio);
    alerta.id_usuario = reservatorio.id_usuario;
    await this.validarAreaAlerta(alerta.id_area_alerta, alerta.id_reservatorio);
    await this.validarUsuario(alerta.id_usuario);
    await this.validarDuplicidade(
      alerta.id_reservatorio,
      alerta.id_area_alerta,
      alerta.tipo,
      alerta.data_analise
    );

    const criado = await Alertas.create(alerta);

    return toAlertaResponse(criado);
  }

  static async executaBulk(
    body: CriarAlertaBulkBodyRequest
  ): Promise<CriarAlertaResponse[]> {
    const { alertas } = body;

    const alertasValidos: CriarAlertaBodyRequest[] = [];

    for (const item of alertas) {
      try {
        const reservatorio = await this.validarReservatorio(item.id_reservatorio);
        await this.validarAreaAlerta(item.id_area_alerta, item.id_reservatorio);
        await this.validarUsuario(reservatorio.id_usuario);
        await this.validarDuplicidade(
          item.id_reservatorio,
          item.id_area_alerta,
          item.tipo,
          item.data_analise
        );

        alertasValidos.push({
          id_usuario: reservatorio.id_usuario,
          id_reservatorio: item.id_reservatorio,
          id_area_alerta: item.id_area_alerta,
          tipo: item.tipo,
          nivel: item.nivel ?? null,
          titulo: item.titulo ?? null,
          descricao: item.descricao ?? null,
          data_analise: item.data_analise,
          data_alerta: item.data_alerta ?? new Date(),
          percentual_principal: item.percentual_principal ?? null,
          total_pixels: item.total_pixels ?? null,
          detalhes: item.detalhes ?? null,
          status: item.status ?? "novo",
          visualizado: item.visualizado ?? false,
        });
      } catch (err: any) {
        if (err.status === http_status.BAD_REQUEST) {
          continue;
        }

        throw err;
      }
    }

    if (alertasValidos.length === 0) {
      return [];
    }

    const criados = await Alertas.bulkCreate(alertasValidos);

    return criados.map(toAlertaResponse);
  }
}
