import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Missoes from '../../models/Missoes';
import { GetMissaoParamsRequest,GetMissaoResponse } from '../../types/missoes-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do Missao inválido"))
})
export default class GetMissaoUseCase{
    static async valida(params:GetMissaoParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetMissaoParamsRequest):Promise<GetMissaoResponse>{
        try{
            const { id } = params
            const missao = await Missoes.findByPk(id)
            if(!missao){
                throw({
                    message:`missao ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
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