import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";

import {
    BuscarAssinaturaPorIdParamsRequest,
    BuscarAssinaturaPorIdResponse,
    toAssinaturaResponse,
} from "../../types/assinaturas-types";


import {
  AtorAutenticado,
  exigeDonoOuAdmin,
} from "../../utils/autorizacao-recurso";

export default class BuscarAssinaturaPorIdUseCase {

    static async valida(
        params: BuscarAssinaturaPorIdParamsRequest
    ): Promise<void> {

        const schema = Joi.object({
            id_assinatura: Joi.string()
                .uuid()
                .required()
        });

        try {
            await schema.validateAsync(params);
        }
        catch (err: any) {

            throw {
                message: err.message,
                status: httpStatus.BAD_REQUEST
            };

        }

    }


    static async executa(
        params: BuscarAssinaturaPorIdParamsRequest,
        ator: AtorAutenticado
    ): Promise<BuscarAssinaturaPorIdResponse> {

        try {

            await this.valida(params);


            const assinatura = await Assinaturas.findByPk(
                params.id_assinatura
            );


            if (!assinatura) {

                throw {
                    message: "Assinatura não encontrada",
                    status: httpStatus.NOT_FOUND
                };

            }


            exigeDonoOuAdmin(ator, assinatura.id_usuario);

            return toAssinaturaResponse(
                assinatura
            );

        }
        catch (err: any) {

            throw {
                message: err.message,
                status: err.status ?? httpStatus.INTERNAL_ERROR
            };

        }

    }

}