import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import { CriarArea_AlertaBody, CriarArea_AlertaResponse } from '../../../types/phytobloom-types/areas_alertas-types';
import Areas_Alertas from '../../../models/phytoBloom/Areas_Alertas';

const create_body_schema=Joi.object({
    id_reservatorio: Joi.number().required(),
    nome: Joi.string(),
    regiao_alerta:  Joi.array().items(
        Joi.object({
            latitude: Joi.string().required().error(new Error('Latitude inválida')),
            longitude: Joi.string().required().error(new Error('Longitude inválida'))
        }).required()
    ).required()
})
export default class CriarAreas_AlertaUseCase{
    static async valida(body:CriarArea_AlertaBody){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarArea_AlertaBody):Promise<CriarArea_AlertaResponse>{
        try{
            const { 
                id_reservatorio,
                nome,
                regiao_alerta
            } = body
            
            const alerta=await Areas_Alertas.create({
               id_reservatorio,
               nome,
               regiao_alerta
            })
            return {
                id:alerta.id,
                id_reservatorio,
                nome,
                regiao_alerta
            }
        }
        catch(err){
            throw(err)
        }
    }
}