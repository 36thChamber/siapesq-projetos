import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Motores from '../../models/Motores';
import {CriarMotorBodyRequest,CriarMotorResponse} from '../../types/motores-types'
import MarcaMotores from '../../models/Marca-Motores';
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(()=>new Error("Nome do motor não informado")),
    id_marca:Joi.number().required().error(()=>new Error("Id da Marca do Motor não enviado não informado")),
    potencia:Joi.number().required().error(()=>new Error("Potencia do motor não informada"))
})
export default class CriarMotorUseCase{
    static async valida(body:CriarMotorBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarMotorBodyRequest):Promise<CriarMotorResponse>{
        try{
            const {id_marca} = body
            const marca = await MarcaMotores.findByPk(id_marca)
            if(!marca){
                throw({
                    message:"Marca do Motor não encontrada",
                    status:http_status.NOT_FOUND
                })
            }
            const motor = await Motores.create(body)
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