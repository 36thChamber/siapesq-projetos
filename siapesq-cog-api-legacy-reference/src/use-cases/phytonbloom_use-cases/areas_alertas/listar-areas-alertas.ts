import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import { ListarArea_AlertasRequeryRequest, ListarArea_AlertasResponse } from '../../../types/phytobloom-types/areas_alertas-types';
import Areas_Alertas from '../../../models/phytoBloom/Areas_Alertas';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListarAreas_AlertasUseCase{
    static async valida(query:ListarArea_AlertasRequeryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarArea_AlertasRequeryRequest):Promise<ListarArea_AlertasResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Areas_Alertas.findAndCountAll({limit,offset})
            return {
                areas_alertas:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}