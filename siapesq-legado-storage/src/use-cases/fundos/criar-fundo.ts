import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Fundos from '../../models/Fundos';
import {CriarFundoBodyRequest,CriarFundoResponse} from '../../types/fundos-types'
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(()=>new Error("Nome do fundo não informado"))
})
export default class CriarFundoUseCase{
    static async valida(body:CriarFundoBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarFundoBodyRequest):Promise<CriarFundoResponse>{
        try{
            const fundo = await Fundos.create(body)
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