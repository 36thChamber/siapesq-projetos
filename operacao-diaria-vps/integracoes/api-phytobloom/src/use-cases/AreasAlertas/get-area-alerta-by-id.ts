import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import AreasAlertas from '../../models/AreasAlertas';
import Reservatorios from '../../models/Reservatorios';
import {
    GetAreaAlertaParamsRequest,
    GetAreaAlertaResponse,
    toAreasAlertasResponse,
} from '../../types/areas_alertas-types';

// Schema agora inclui id_usuario
const req_params_schema = Joi.object({
    id: Joi.number()
        .required()
        .error(() => new Error('id da área de alerta inválido')),
    id_usuario: Joi.number()
        .integer()
        .required()
        .error(() => new Error('id_usuario inválido')),
});

export default class GetAreasAlertaUseCase {

    static async valida(params: GetAreaAlertaParamsRequest) {
        try {
            await req_params_schema.validateAsync(params);
        }
        catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST,
            };
        }
    }

    private static async validarPropriedadeReservatorio(
        id_reservatorio: number,
        id_usuario: number
    ): Promise<void> {
        const reservatorio = await Reservatorios.findByPk(id_reservatorio);

        if (!reservatorio) {
            throw {
                message: 'Reservatório não encontrado',
                status: http_status.NOT_FOUND,
            };
        }

        if (Number(reservatorio.id_usuario) !== Number(id_usuario)) {
            throw {
                message: 'Acesso negado: você não tem permissão para visualizar esta área de alerta',
                status: http_status.FORBIDDEN,
            };
        }
    }

    static async executa(
        params: GetAreaAlertaParamsRequest,
        is_admin: boolean = false
    ): Promise<GetAreaAlertaResponse> {
        const area = await AreasAlertas.findByPk(params.id);

        if (!area) {
            throw {
                message: `Área de alerta ${params.id} não encontrada`,
                status: http_status.NOT_FOUND,
            };
        }

        if (!is_admin) {
            await this.validarPropriedadeReservatorio(
                area.id_reservatorio,
                params.id_usuario
            );
        }

        return toAreasAlertasResponse(area);
    }
}
