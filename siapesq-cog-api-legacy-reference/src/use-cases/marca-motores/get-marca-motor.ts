import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import MarcaMotores from '../../models/Marca-Motores';
import { GetMarcaMotorParamsRequest,GetMarcaMotorResponse } from '../../types/marca-motores-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id da marca do motor inválido"))
})
export default class GetMarcaMotorUseCase{
    static async valida(params:GetMarcaMotorParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetMarcaMotorParamsRequest):Promise<GetMarcaMotorResponse>{
        try{
            const { id } = params
            const marca_motor = await MarcaMotores.findByPk(id)
            if(!marca_motor){
                throw({
                    message:`Marca ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:marca_motor.id,
                nome:marca_motor.nome,
                ativo:marca_motor.ativo,
                criado_em:marca_motor.criado_em,
                atualizado_em:marca_motor.atualizado_em,
                deletado_em:marca_motor.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}