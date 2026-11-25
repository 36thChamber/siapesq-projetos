import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Armadilhas from '../../models/Armadilhas';
import { ListarArmadilhasQueryRequest,ListarArmadilhasResponse } from '../../types/armadilhas-types';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListarArmadilhasUseCase{
    static async valida(query:ListarArmadilhasQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarArmadilhasQueryRequest):Promise<ListarArmadilhasResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Armadilhas.findAndCountAll({limit,offset})
            return {
                armadilhas:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}