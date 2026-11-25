import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Iscas from '../../models/Iscas';
import {CriarIscaBodyRequest,CriarIscaResponse} from '../../types/iscas-types'
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(()=>new Error("Nome da Isca não informado"))
})
export default class CriarIscaUseCase{
    static async valida(body:CriarIscaBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarIscaBodyRequest):Promise<CriarIscaResponse>{
        try{
            const isca = await Iscas.create(body)
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