import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import PeixeRFID from '../../models/PeixeRFID';
import { ObterPeixeRFIDParamsRequest, ObterPeixeRFIDResponse } from '../../types/peixeRFID-types';

const req_params_schema = Joi.object({
    id: Joi.number().required().error(() => new Error("ID do PeixeRFID inválido"))
});

export default class ObterPeixeRFIDUseCase {
    static async valida(params: ObterPeixeRFIDParamsRequest) {
        try {
            await req_params_schema.validateAsync(params);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    static async executa(params: ObterPeixeRFIDParamsRequest): Promise<ObterPeixeRFIDResponse> {
        try {
            const { id } = params;
            const peixeRFID = await PeixeRFID.findByPk(id);

            if (!peixeRFID) {
                throw {
                    message: `PeixeRFID ${id} não encontrado`,
                    status: http_status.NOT_FOUND
                };
            }

            return {
                id: peixeRFID.id,
                id_especie: peixeRFID.id_especie,
                id_lance: peixeRFID.id_lance,
                latitude: peixeRFID.latitude,
                longitude: peixeRFID.longitude,
                hex: peixeRFID.hex,
                created: peixeRFID.created,
                deleted: peixeRFID.deleted
            };
        } catch (err) {
            throw err;
        }
    }
}
