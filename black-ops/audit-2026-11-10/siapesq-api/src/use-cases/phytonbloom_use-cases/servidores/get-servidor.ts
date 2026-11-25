import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import { ListarServidoresQueryRequest,ListarServidoresResponse } from '../../../types/phytobloom-types/servidores-types';
import Servidores from '../../../models/phytoBloom/Servidores';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListarServidoresUseCase{
    static async valida(query:ListarServidoresQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarServidoresQueryRequest):Promise<ListarServidoresResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Servidores.findAndCountAll({limit,offset})
            return {
                servidores:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}