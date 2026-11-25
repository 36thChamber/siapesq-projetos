import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import {CriarMissaoBodyRequest,CriarMissaoResponse} from '../../types/missoes-types'
import Missoes from '../../models/Missoes';
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(()=>new Error("Nome do Missao não informado"))
})
export default class CriarMissaoUseCase{
    static async valida(body:CriarMissaoBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarMissaoBodyRequest):Promise<CriarMissaoResponse>{
        try{
            const missao = await Missoes.create(body)
            return {
                id:missao.id,
                id_embarcacao:missao.id_embarcacao,
                iniciou_em:missao.iniciou_em,
                terminou_em:missao.terminou_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}