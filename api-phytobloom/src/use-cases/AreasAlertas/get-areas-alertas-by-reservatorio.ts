import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import Reservatorios from '../../models/Reservatorios';
import AreasAlertas from '../../models/AreasAlertas';
import {
    ListarAreasReservatorioResponse,
    toAreasAlertasResponse,
} from '../../types/areas_alertas-types';

type ListarAreasPorReservatorioRequest = {
    id_reservatorio: number;
    id_usuario: number; 
    limit?: number;
    offset?: number;
};

const req_schema = Joi.object({
    id_reservatorio: Joi.number()
        .required()
        .error(() => new Error('id_reservatorio inválido')),

    id_usuario: Joi.number()
        .integer()
        .required()
        .error(() => new Error('id_usuario inválido')),

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
});

export default class ListarAreasPorReservatorioUseCase {

    static async valida(query: ListarAreasPorReservatorioRequest) {
        try {
            await req_schema.validateAsync(query);
        }
        catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST,
            };
        }
    }

    static async executa(
        query: ListarAreasPorReservatorioRequest,
        id_usuario?: number,
        is_admin: boolean = false
    ): Promise<ListarAreasReservatorioResponse> {
        const {
            id_reservatorio,
            limit = 10000,
            offset = 0,
        } = query;

       
        const reservatorio = await Reservatorios.findByPk(id_reservatorio);

        if (!reservatorio) {
            throw {
                message: 'Reservatório não encontrado',
                status: http_status.NOT_FOUND,
            };
        }

        // Se não for admin, verifica ownership
        // Number(...) nos dois lados: id_usuario vem como BIGINT do Postgres,
        // que o driver devolve como string — comparar direto com !== nunca bate.
        if (!is_admin && id_usuario !== undefined && Number(reservatorio.id_usuario) !== Number(id_usuario)) {
            throw {
                message: 'Acesso negado: reservatório pertence a outro usuário',
                status: http_status.FORBIDDEN,
            };
        }

        const { rows, count } = await AreasAlertas.findAndCountAll({
            where: {
                id_reservatorio,
            },
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