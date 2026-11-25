import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Armadilhas from '../../models/Armadilhas';
import { GetArmadilhaParamsRequest,GetArmadilhaResponse } from '../../types/armadilhas-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id da armadilha inválido"))
})
export default class GetArmadilhaUseCase{
    static async valida(params:GetArmadilhaParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetArmadilhaParamsRequest):Promise<GetArmadilhaResponse>{
        try{
            const { id } = params
            const armadilha = await Armadilhas.findByPk(id)
            if(!armadilha){
                throw({
                    message:`Armadilha ${id} não encontrada`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:armadilha.id,
                modelo:armadilha.modelo,
                tipo:armadilha.tipo,
                forma:armadilha.forma,
                ativo:armadilha.ativo,
                criado_em:armadilha.criado_em,
                atualizado_em:armadilha.atualizado_em,
                deletado_em:armadilha.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}