import http_status from '../../consts/http-status-enum';
import Missoes from '../../models/Missoes';
import Lances from '../../models/Lances';
import Embarcacoes from '../../models/Embarcacoes';
import Usuarios from '../../models/Usuarios';
import ArtesDePesca from '../../models/ArtesDePesca';
import Especies from '../../models/Especies';
import { GetDetalhesMissaoParamsRequest, GetMissaoParamsRequest, GetMissaoResponse } from '../../types/missoes-types';
import Joi from 'joi'

const req_params_schema = Joi.object({
    id: Joi.number().required().error(() => new Error("Id da missão está invalido!"))
})
export default class GetDetalhesMissao {
    static async valida(params: GetDetalhesMissaoParamsRequest) {
        try {
            await req_params_schema.validateAsync(params)
        } catch (err: any) {

        }
    }
    static async executa(params: GetMissaoParamsRequest): Promise<GetMissaoResponse> {
        try {
            const { id } = params
            const missao = await Missoes.findByPk(id, {
                include: [
                    {
                        model: Lances,
                        as: 'lances',
                    },
                    {
                        model: Especies,
                        as: 'especie_missoes_alvo',
                    },
                    {
                        model: Embarcacoes,
                        as: "embarcacao",
                        include: [
                            {
                                model: Usuarios,
                                as: 'mestre'
                            }
                        ]
                    },
                    {
                        model: ArtesDePesca,
                        as: 'arte_de_pesca',
                    }
                ]
            })

            if (!missao) {
                throw { status: http_status.NOT_FOUND, message: "Missão não encontrada" }
            }

            return missao
        } catch (err: any) {
            throw ({ message: err.message, status: http_status.BAD_REQUEST })
        }
    }

}