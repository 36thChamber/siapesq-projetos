import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import ArtesDePesca from '../../models/ArtesDePesca';
import { ListaArtesResponse, ListarArtesQueryRequest } from '../../types/artesDePesca-types';

const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})

export default class ListArtesDePescaUseCase{
    static async valida(query:ListarArtesQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarArtesQueryRequest):Promise<ListaArtesResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await ArtesDePesca.findAndCountAll({limit,offset})

            return {
                artesDePesca: rows,
                total: count
            }
        }
        catch(err){
            throw(err)
        }
    }
}