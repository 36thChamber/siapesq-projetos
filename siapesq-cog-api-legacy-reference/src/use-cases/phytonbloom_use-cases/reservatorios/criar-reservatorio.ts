import Joi from 'joi'
import { CriarReservatorioBody, CriarReservatorioResponse } from '../../../types/phytobloom-types/reservatorios-types';
import http_status from '../../../consts/http-status-enum';
import Reservatorios from '../../../models/phytoBloom/Reservatorios';

const create_body_schema = Joi.object({
    id_usuario: Joi.number().required().error(new Error("Id do usuario inválido")),
    nome: Joi.string().required().error(new Error("Nome inválido")),
    prioridade: Joi.number().optional().error(new Error("Prioridade inválida")), // agora é opcional
    posicoes: Joi.array().items(
        Joi.object({
            latitude: Joi.string().required().error(new Error('Latitude inválida')),
            longitude: Joi.string().required().error(new Error('Longitude inválida'))
        }).required()
    ).required()
});

export default class CriarReservatorioUseCase {
    static async valida(body: CriarReservatorioBody) {
        try {
            await create_body_schema.validateAsync(body, { stripUnknown: true });
        } catch (err: any) {
            throw ({ message: err.message, status: http_status.BAD_REQUEST });
        }
    }

    static async executa(body: CriarReservatorioBody): Promise<CriarReservatorioResponse> {
        try {
            const {
                id_usuario,
                nome,
                prioridade,
                posicoes
            } = body;

            const nome_exist = await Reservatorios.findOne({ where: { nome } });
            if (nome_exist) {
                throw ({
                    message: `Reservatório ${nome} já foi cadastrado`,
                    status: http_status.CONFLICT
                });
            }

            // Se prioridade não for enviada, calcula com base no máximo atual para o usuário
            let prioridadeFinal = prioridade;

            if (prioridadeFinal === undefined || prioridadeFinal === null) {
                const max_prioridade = await Reservatorios.max('prioridade', {
                    where: { id_usuario }
                }) as number | null;

                prioridadeFinal = (max_prioridade ?? 0) + 1;
            }

            const reservatorio = await Reservatorios.create({
                id_usuario,
                nome,
                prioridade: prioridadeFinal,
                posicoes
            });

            return {
                id: reservatorio.id,
                id_usuario,
                nome,
                prioridade: prioridadeFinal,
                posicoes
            };
        } catch (err) {
            throw (err);
        }
    }
}
