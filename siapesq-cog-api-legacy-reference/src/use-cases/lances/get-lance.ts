import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Lances from '../../models/Lances';
import { GetLanceParamsRequest, GetLanceResponse } from '../../types/lances-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do fundo inválido"))
})
export default class GetFundoUseCase{
    static async valida(params:GetLanceParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetLanceParamsRequest):Promise<Lances>{
        try{
            const { id } = params
            const lance = await Lances.findByPk(id)
            if(!lance){
                throw({
                    message:`Lance ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return lance
        }
        catch(err){
            throw(err)
        }
    }
}