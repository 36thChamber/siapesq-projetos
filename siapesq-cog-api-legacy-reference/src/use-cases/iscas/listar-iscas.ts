import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Iscas from '../../models/Iscas';
import { ListarIscasQueryRequest,ListarIscasResponse } from '../../types/iscas-types';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListaPortosUseCase{
    static async valida(query:ListarIscasQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarIscasQueryRequest):Promise<ListarIscasResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Iscas.findAndCountAll({limit,offset})
            return {
                iscas:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}