import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import { CriarPeixeRFIDBodyRequest, CriarPeixeRFIDResponse } from '../../types/peixeRFID-types';
import PeixeRFID from '../../models/PeixeRFID';

const create_body_schema = Joi.object({
    id_especie: Joi.number().required(),
    id_lance: Joi.number().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    hex: Joi.string().required(),
    created: Joi.date().required(),
    deleted: Joi.boolean().required(),
});

export default class CriarPeixeRFIDUseCase {
    static async valida(body: CriarPeixeRFIDBodyRequest) {
        try {
            // Valida os dados do corpo da requisiçao com o esquema
            await create_body_schema.validateAsync(body);
        } catch (err: any) {
            // Se a validaçao falhar, lança um erro de badrequest
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    static async executa(body: CriarPeixeRFIDBodyRequest): Promise<CriarPeixeRFIDResponse> {
        try {
            // Cria um novo PeixeRFID com os dados fornecidos
            const peixeRFID = await PeixeRFID.create(body);
            return peixeRFID; // Retorna o novo PeixeRFID criado
        } catch (err) {
            // Se ocorrer um erro, repasse-o
            throw err;
        }
    }
}
