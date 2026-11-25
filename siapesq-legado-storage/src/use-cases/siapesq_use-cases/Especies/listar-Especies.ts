import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import especies from '../../../models/siapesq/Especies';
import { ListarEspeciesQueryRequest,ListarEspeciesResponse } from '../../../types/siapesq_types/Especies-types'
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListarEspeciesUseCase{
    static async valida(query:ListarEspeciesQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarEspeciesQueryRequest):Promise<ListarEspeciesResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await especies.findAndCountAll({limit,offset})
            return {
                especies:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}