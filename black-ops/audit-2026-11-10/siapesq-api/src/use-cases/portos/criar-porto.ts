import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Portos from '../../models/Portos';
import {CriarPortoBodyRequest,CriarPortoResponse} from '../../types/portos-types'
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(()=>new Error("Nome do Porto não informado"))
})
export default class CriarPortoUseCase{
    static async valida(body:CriarPortoBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarPortoBodyRequest):Promise<CriarPortoResponse>{
        try{
            const porto = await Portos.create(body)
            return {
                id:porto.id,
                nome:porto.nome,
                ativo:porto.ativo,
                criado_em:porto.criado_em,
                atualizado_em:porto.atualizado_em,
                deletado_em:porto.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}