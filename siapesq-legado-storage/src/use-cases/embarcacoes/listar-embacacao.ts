import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Embarcacoes from '../../models/Embarcacoes';
import { ListarEmbarcacaoQueryRequest, ListarEmbarcacaoResponse } from '../../types/embarcacao-types';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListaEmbarcacaoUseCase{
    static async valida(query:ListarEmbarcacaoQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarEmbarcacaoQueryRequest):Promise<ListarEmbarcacaoResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Embarcacoes.findAndCountAll({limit,offset})
            return {
                embarcacoes:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}