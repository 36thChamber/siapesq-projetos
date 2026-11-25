import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Motores from '../../models/Motores';
import { ListarMotoresQueryRequest,ListarMotoresResponse } from '../../types/motores-types';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListarMotoresUseCase{
    static async valida(query:ListarMotoresQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarMotoresQueryRequest):Promise<ListarMotoresResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Motores.findAndCountAll({limit,offset})
            return {
                motores:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}