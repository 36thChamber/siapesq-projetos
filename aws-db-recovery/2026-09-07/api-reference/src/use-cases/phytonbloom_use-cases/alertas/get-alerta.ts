import Alertas from '../../../models/phytoBloom/Alertas';
import { GetAlertaResponse } from '../../../types/phytobloom-types/alertas-types'
import http_status from '../../../consts/http-status-enum';
import Joi from 'joi';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do alerta inválido"))
})
export default class GetAlertaUseCase{
    
    static async valida(params:{id:number}){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:{id:number}):Promise<GetAlertaResponse>{
        try{
            const { id } = params
            const alerta = await Alertas.findByPk(id)
            if(!alerta){
                throw({
                    message:`Alerta ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id: alerta.id,
                id_reservatorio: alerta.id_reservatorio,
                data_alerta: alerta.data_alerta,
                hora_alerta: alerta.hora_alerta,
                nivel_critico: alerta.nivel_critico,
                tipo: alerta.tipo,
                id_area_alerta: alerta.id_area_alerta,
                criado_em: alerta.criado_em,
                atualizado_em: alerta.atualizado_em,
                deletado_em: alerta.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}