import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import { ListarEspeciesAnalisesQueryRequest, ListarEspeciesAnalisesResponse } from '../../types/especies_analises-types';
import Especies_analises from '../../models/Especies_analises';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListaEspeciesAnalisesUseCase{
    static async valida(query:ListarEspeciesAnalisesQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarEspeciesAnalisesQueryRequest):Promise<ListarEspeciesAnalisesResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Especies_analises.findAndCountAll({limit,offset})
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