import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Iscas from '../../models/Iscas';
import { GetIscaParamsRequest, GetIscaResponse } from '../../types/iscas-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do porto inválido"))
})
export default class GetIscaUseCase{
    static async valida(params:GetIscaParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetIscaParamsRequest):Promise<GetIscaResponse>{
        try{
            const { id } = params
            const isca = await Iscas.findByPk(id)
            if(!isca){
                throw({
                    message:`Isca ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:isca.id,
                nome:isca.nome,
                ativo:isca.ativo,
                criado_em:isca.criado_em,
                atualizado_em:isca.atualizado_em,
                deletado_em:isca.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}