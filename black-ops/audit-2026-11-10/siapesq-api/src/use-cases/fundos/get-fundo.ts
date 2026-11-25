import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Fundos from '../../models/Fundos';
import { GetFundoParamsRequest,GetFundoResponse } from '../../types/fundos-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do fundo inválido"))
})
export default class GetFundoUseCase{
    static async valida(params:GetFundoParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetFundoParamsRequest):Promise<GetFundoResponse>{
        try{
            const { id } = params
            const fundo = await Fundos.findByPk(id)
            if(!fundo){
                throw({
                    message:`Fundo ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:fundo.id,
                nome:fundo.nome,
                ativo:fundo.ativo,
                criado_em:fundo.criado_em,
                atualizado_em:fundo.atualizado_em,
                deletado_em:fundo.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}