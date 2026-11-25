import Joi from "joi";
import { CriarGrupoEspecieBody, CriarGrupoEspecieResponse } from "../../../types/siapesq_types/grupoEspecie-types";
import gruposEspecies from "../../../models/siapesq/GrupoEspecies";
import http_status from '../../../consts/http-status-enum';
const schema = Joi.object({
    nome: Joi.string().required(),
    quantidade: Joi.number().required(),
});

export default class CriarGrupoEspecieUseCase {
    static async valida(body: CriarGrupoEspecieBody) {

        try {
            await schema.validateAsync(body);
        } catch (err: any) {
            throw ({ message: err.message, status: http_status.BAD_REQUEST })
        }
    }

    static async executa(body: CriarGrupoEspecieBody): Promise<CriarGrupoEspecieResponse> {
        try {
            const novoGrupoEspecie = await gruposEspecies.create({
                nome: body.nome,
                quantidade: body.quantidade,
            });

            return {
                id_gruposespecies: novoGrupoEspecie.id_gruposespecies,
                nome: novoGrupoEspecie.nome,
                quantidade: novoGrupoEspecie.quantidade,
            };
        } catch (err: any) {
            throw ({ message: err.message, status: http_status.BAD_REQUEST })
        }
    }
}
