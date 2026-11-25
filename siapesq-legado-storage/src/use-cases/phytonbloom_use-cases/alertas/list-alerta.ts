import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import { ListarAlertasRequeryRequest, ListarAlertasResponse } from '../../../types/phytobloom-types/alertas-types';
import Alertas from '../../../models/phytoBloom/Alertas';
import { Op } from 'sequelize';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido")),
    data_inicio: Joi.date().default(0).error(()=>new Error('Data inicio invalida ')),
    data_fim: Joi.date().default(0).error(()=>new Error('Data fim invalida'))
})
export default class ListaAlertaUseCase{
    static async valida(query:ListarAlertasRequeryRequest){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarAlertasRequeryRequest):Promise<ListarAlertasResponse>{
        try{
            
            const { limit,offset, data_inicio, data_fim } = query
            const limit_off = {limit, offset, where: {}}

            if(data_inicio && data_fim){
                limit_off.where = {
                    data_alerta: {
                        [Op.between]: [data_inicio,data_fim]
                    }
                }
            }
            const {rows,count} = await Alertas.findAndCountAll(limit_off)
            return {
                alertas:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}