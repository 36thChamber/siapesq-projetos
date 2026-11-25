import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import gruposEspecies from '../../../models/siapesq/GrupoEspecies';
import { ListarGruposEspeciesQueryRequest,ListarGruposEspeciesResponse } from '../../../types/siapesq_types/grupoEspecie-types'
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListarGruposEspeciesUseCase{
    static async valida(query:ListarGruposEspeciesQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarGruposEspeciesQueryRequest):Promise<ListarGruposEspeciesResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await gruposEspecies.findAndCountAll({limit,offset})
            return {
                gruposEspecies:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}