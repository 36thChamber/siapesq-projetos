import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import Servidores from '../../../models/phytoBloom/Servidores' 
import {CriarServidorBody,CriarServidorResponse} from '../../../types/phytobloom-types/servidores-types'

const create_body_schema=Joi.object({
    id_usuario:Joi.number().required().error(new Error("Usuario nao encontrado")),
    nome:Joi.string().required().error(()=>new Error("Nome do servidor não informado")),
    cpf:Joi.string().required().error(()=>new Error("CPF do servidor não informado")),
    email:Joi.string().required().error(()=>new Error("Email do servidor não informado")),

})
export default class CriarServidorUseCase{
    static async valida(body:CriarServidorBody){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){

            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarServidorBody):Promise<CriarServidorResponse>{
        try{
            const {cpf} = body
            const cpf_exist=await Servidores.findOne({where:{cpf}})
            if(cpf_exist){
                throw({
                    message:`Servidor com cpf ${cpf} ja foi cadastrado`,
                    status:http_status.CONFLICT
                })
            }
            const servidor = await Servidores.create(body)
            return {
                id:servidor.id,
                id_usuario: servidor.id_usuario,
                nome:servidor.nome,
                cpf:servidor.cpf,
                email:servidor.email
            }
        }
        catch(err){
            throw(err)
        }
    }
}