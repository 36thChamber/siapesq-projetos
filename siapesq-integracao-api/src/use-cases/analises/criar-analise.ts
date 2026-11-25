import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Analises from "../../models/Analises";
import { TipoUsuario } from "../../models/enums/tipoUsuarioEnum";
import { resolverTifAdequabilidade } from "../../utils/analise-tif-storage";

import {
    CriarAnaliseBodyRequest,
    CriarAnaliseResponse,
    toAnaliseResponse,
} from "../../types/analises-types";


export default class CriarAnaliseUseCase {

    static async valida(
        body: CriarAnaliseBodyRequest
    ): Promise<void> {

        const schema = Joi.object({
            id_especie: Joi.string()
                .uuid()
                .required(),

            nome_pasta: Joi.string()
                .required(),

            nome_dataset: Joi.string().allow(null).optional(),
            cenario: Joi.string().allow(null).optional(),

            nome_arquivo: Joi.string()
                .required(),

            nome_arquivo_30: Joi.string()
                .allow(null)
                .optional(),
        });

        try {
            await schema.validateAsync(body);
            if (body.nome_dataset != null || body.cenario != null) {
                resolverTifAdequabilidade({
                    nome_dataset: body.nome_dataset ?? null,
                    nome_pasta: body.nome_pasta,
                    cenario: body.cenario ?? null,
                    nome_arquivo: body.nome_arquivo,
                });
            }
        } catch (err: any) {
            throw {
                message: err.message,
                status: httpStatus.BAD_REQUEST,
            };
        }
    }


    static async executa(
        body: CriarAnaliseBodyRequest,
        tipo_usuario?: string,
    ): Promise<CriarAnaliseResponse> {
        if ((body.nome_dataset !== undefined || body.cenario !== undefined) && tipo_usuario !== TipoUsuario.ADMIN) {
            throw { status: httpStatus.FORBIDDEN, message: "Somente administradores podem mapear TIFFs." };
        }
        await this.valida(body);

        try {

            const analise = await Analises.create({
                id_especie: body.id_especie,
                nome_pasta: body.nome_pasta,
                nome_dataset: body.nome_dataset ?? null,
                cenario: body.cenario ?? null,
                nome_arquivo: body.nome_arquivo,
                nome_arquivo_30:
                    body.nome_arquivo_30 ?? null,
            });


            return toAnaliseResponse(
                analise
            );

        } catch (err: any) {

            throw {
                message: err.message,
                status: err.status ?? httpStatus.BAD_REQUEST,
            };

        }
    }

}
