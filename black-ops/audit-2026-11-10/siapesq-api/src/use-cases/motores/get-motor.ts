import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Motores from '../../models/Motores';
import { GetMotorParamsRequest,GetMotorResponse } from '../../types/motores-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do motor inválido"))
})
export default class GetMotorUseCase{
    static async valida(params:GetMotorParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetMotorParamsRequest):Promise<GetMotorResponse>{
        try{
            const { id } = params
            const motor = await Motores.findByPk(id)
            if(!motor){
                throw({
                    message:`Motor ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:motor.id,
                nome:motor.nome,
                potencia:motor.potencia,
                id_marca:motor.id_marca,
                ativo:motor.ativo,
                criado_em:motor.criado_em,
                atualizado_em:motor.atualizado_em,
                deletado_em:motor.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}