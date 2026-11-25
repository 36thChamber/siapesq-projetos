import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import { ListarReservatorioQueryRequest, ListarReservatorioResponse } from '../../../types/phytobloom-types/reservatorios-types';
import Reservatorios from '../../../models/phytoBloom/Reservatorios';
import Areas_Alertas from '../../../models/phytoBloom/Areas_Alertas';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListaReservatorioUseCase{
    static async valida(query:ListarReservatorioQueryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarReservatorioQueryRequest):Promise<ListarReservatorioResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await Reservatorios.findAndCountAll({
                limit,
                offset,
                include: [{
                    model: Areas_Alertas,
                    as: 'areas_alertas',
                    required: true
                }]
            })
            return {
                reservatorios:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}