import Joi from 'joi'
import { Op } from 'sequelize';
import http_status from '../../consts/http-status-enum'
import Alertas from '../../models/Alertas';
import Areas_Alertas from '../../models/AreasAlertas';

const req_schema = Joi.object({
    id_area_alerta: Joi.number()
        .required()
        .error(() => new Error('id_area_alerta inválido')),

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

    data_inicio: Joi.date()
        .optional()
        .error(() => new Error('Data início inválida')),

    data_fim: Joi.date()
        .optional()
        .error(() => new Error('Data fim inválida'))
})

export default class ListarAlertasPorAreaAlertaUseCase {

    static async valida(query: any) {
        try {
            await req_schema.validateAsync(query)
        }
        catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST
            }
        }
    }

    static async executa(query: any) {
        try {
            const {
                id_area_alerta,
                limit = 10000,
                offset = 0,
                data_inicio,
                data_fim
            } = query;
            
            // Valida se a área de alerta existe
            const areaAlerta = await Areas_Alertas.findByPk(id_area_alerta);
            
            if (!areaAlerta) {
                throw {
                    message: 'Área de alerta não encontrada',
                    status: http_status.NOT_FOUND
                };
            }
            
            const where: any = { id_area_alerta };
            
            if (data_inicio && data_fim) {
                where.data_alerta = {
                    [Op.between]: [new Date(data_inicio), new Date(data_fim)]
                };
            }
            
            const { rows, count } = await Alertas.findAndCountAll({
                where,
                limit,
                offset,
                order: [['data_alerta', 'DESC']]
            });
            
            return {
                alertas: rows,
                total: count
            };
        }
        catch (err) {
            throw err;
        }
    }
}