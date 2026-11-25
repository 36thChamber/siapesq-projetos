import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import {CriarLanceBodyRequest,CriarLanceResponse} from '../../types/lances-types'
import Lances from '../../models/Lances';
const create_body_schema=Joi.object({
    id_missao:Joi.number().required(),
    id_isca:Joi.number(),
    id_armadilha:Joi.number(),
    lancado_em:Joi.date(),
    recolhido_em:Joi.date(),
    latitude:Joi.number(),
    longitude:Joi.number(),
    n_lance_armadilhas:Joi.number(),
    n_recolha_armadilhas:Joi.number(),
    profundidade:Joi.number().required(),
    ativo: Joi.boolean().required(),
    criado_em:Joi.date().required(),
    atualizado_em:Joi.date().required()
})
export default class CriarLanceUseCase{
    static async valida(body:CriarLanceBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarLanceBodyRequest):Promise<Lances>{
        try{
            const lance = await Lances.create(body)
            return lance
        }
        catch(err){
            throw(err)
        }
    }
}