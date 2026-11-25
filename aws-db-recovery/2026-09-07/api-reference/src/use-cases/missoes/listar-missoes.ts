import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Missoes from '../../models/Missoes';
import { ListarMissoesQueryRequest, ListarMissoesResponse } from '../../types/missoes-types';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListaMissoesUseCase{
    static async valida(query:ListarMissoesQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarMissoesQueryRequest):Promise<ListarMissoesResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Missoes.findAndCountAll({limit,offset})
            return {
                missoes:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}