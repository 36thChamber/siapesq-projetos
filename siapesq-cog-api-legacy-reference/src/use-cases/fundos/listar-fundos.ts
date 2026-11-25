import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Fundos from '../../models/Fundos';
import { ListarFundosQueryRequest,ListarFundosResponse } from '../../types/fundos-types';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListaPortosUseCase{
    static async valida(query:ListarFundosQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarFundosQueryRequest):Promise<ListarFundosResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Fundos.findAndCountAll({limit,offset})
            return {
                fundos:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}