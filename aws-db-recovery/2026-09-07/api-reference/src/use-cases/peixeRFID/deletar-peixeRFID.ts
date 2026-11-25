import http_status from '../../consts/http-status-enum';
import PeixeRFID from '../../models/PeixeRFID';
import Joi from 'joi';
import {ObterPeixeRFIDParamsRequest} from '../../types/peixeRFID-types'

export default class DeletarPeixeRFIDUseCase {
    static async valida(params: ObterPeixeRFIDParamsRequest) {
        const schema = Joi.object({
            id: Joi.number().required().error(() => new Error('ID de PeixeRFID inválido')),
        });

        try {
            await schema.validateAsync(params);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    static async executa(params: ObterPeixeRFIDParamsRequest) {
        try {
            const peixeRFID = await PeixeRFID.findByPk(params.id);
            if (!peixeRFID) {
                throw { message: 'PeixeRFID não encontrado.', status: http_status.NOT_FOUND };
            }
            await peixeRFID.destroy();
        } catch (err: any) {
            throw { message: err.message, status: http_status.INTERNAL_ERROR };
        }
    }
}
