import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import AreasAlertas from '../../models/AreasAlertas';
import Reservatorios from '../../models/Reservatorios';
import {
    ListarAreasReservatorioQueryRequest,
    ListarAreasReservatorioResponse,
    toAreasAlertasResponse,
} from '../../types/areas_alertas-types';

const req_query_schema = Joi.object({
    limit: Joi.number()
        .integer()
        .min(1)
        .default(10000)
        .error(() => new Error('limit inválido')),

    offset: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .error(() => new Error('offset inválido')),

    id_reservatorio: Joi.number()
        .integer()
        .optional()
        .error(() => new Error('id_reservatorio inválido')),

    tipo: Joi.string()
        .optional()
        .error(() => new Error('tipo inválido')),

    ativa: Joi.boolean()
        .optional()
        .error(() => new Error('ativa inválido')),

    id_usuario: Joi.number()
        .integer()
        .required()
        .error(() => new Error('id_usuario inválido')),
});

export default class ListarAreasReservatorioUseCase {
    static async valida(query: ListarAreasReservatorioQueryRequest) {
        try {
            await req_query_schema.validateAsync(query);
        } catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST,
            };
        }
    }

    static async executa(
        query: ListarAreasReservatorioQueryRequest,
        //id_usuario?: number,
        is_admin: boolean = false
        ): Promise<ListarAreasReservatorioResponse> {
        const {
        limit = 10000,
        offset = 0,
        id_reservatorio,
        tipo,
        ativa,
        id_usuario,
        } = query;

        const where: any = {};

        if (id_reservatorio !== undefined) {
            where.id_reservatorio = id_reservatorio;
        }

        if (tipo !== undefined) {
            where.tipo = tipo;
        }

        if (ativa !== undefined) {
            where.ativa = ativa;
        }

         if (is_admin) {
          const { rows, count } = await AreasAlertas.findAndCountAll({
              where,
              limit,
              offset,
              order: [['id', 'DESC']],
          });

          return {
              areas_alertas: rows.map(toAreasAlertasResponse),
              total: count,
          };
        }
        const { rows, count } = await AreasAlertas.findAndCountAll({
            where,
            include: [
                {
                    model: Reservatorios,
                    as: 'reservatorio',
                    attributes: [],
                    where: { id_usuario },
                    required: true,
                },
            ],
            limit,
            offset,
            order: [['id', 'DESC']],
        });

        return {
            areas_alertas: rows.map(toAreasAlertasResponse),
            total: count,
        };
    }
}