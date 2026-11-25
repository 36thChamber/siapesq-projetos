import http_status from '../../../consts/http-status-enum';
import Joi from 'joi';
import { GetArea_AlertaResponse } from '../../../types/phytobloom-types/areas_alertas-types';
import Areas_Alertas from '../../../models/phytoBloom/Areas_Alertas';
import Alertas from '../../../models/phytoBloom/Alertas';
const req_params_schema=Joi.object({
    id_reservatorio:Joi.number().required().error(()=>new Error("id do reservatório é obrigatório"))
})
export default class GetAreas_AlertaUseCase{
    
    static async valida(params:{id_reservatorio:number}){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:{id_reservatorio:number}):Promise<GetArea_AlertaResponse>{
        try{
            const { id_reservatorio } = params

            const alertas = await Areas_Alertas.findAll(
                {where:{id_reservatorio: id_reservatorio}
            })

            return {alertas}
        }
        catch(err){
            throw(err)
        }
    }
}