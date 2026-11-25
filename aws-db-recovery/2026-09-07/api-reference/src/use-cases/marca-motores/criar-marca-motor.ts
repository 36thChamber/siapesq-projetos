import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import MarcaMotores from '../../models/Marca-Motores';
import {CriarMarcaMotorBodyRequest,CriarMarcaMotorResponse} from '../../types/marca-motores-types'
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(()=>new Error("Nome do da marca do motor não informado"))
})
export default class CriarMarcaMotorUseCase{
    static async valida(body:CriarMarcaMotorBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarMarcaMotorBodyRequest):Promise<CriarMarcaMotorResponse>{
        try{
            const marca_motor = await MarcaMotores.create(body)
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