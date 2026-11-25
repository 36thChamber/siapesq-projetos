import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Armadilhas from '../../models/Armadilhas';
import { CriarArmadilhaBodyRequest, CriarArmadilhaResponse } from '../../types/armadilhas-types';
const create_body_schema=Joi.object({
    modelo:Joi.string().required().error(()=>new Error("Modelo da Armadilha não informado")),
    tipo:Joi.string().required().error(()=>new Error("Tipo da Armadilha não informado")),
    forma:Joi.string().required().error(()=>new Error("Forma da Armadilha não informada"))
})

export default class CriarArmadilhaUseCase{
    static async valida(body:CriarArmadilhaBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarArmadilhaBodyRequest):Promise<CriarArmadilhaResponse>{
        try{
            const armadilha = await Armadilhas.create(body)
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