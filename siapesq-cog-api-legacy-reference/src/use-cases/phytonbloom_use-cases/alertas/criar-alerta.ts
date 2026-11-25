import Joi from 'joi'
import { CriarAlertaBody,CriarAlertaResponse,CriarAlertaBulkBody} from '../../../types/phytobloom-types/alertas-types';
import http_status from '../../../consts/http-status-enum';
import Alertas from '../../../models/phytoBloom/Alertas';

const create_body_schema=Joi.object({
    id_reservatorio: Joi.number().required(),
    id_area_alerta: Joi.number(),
    data_alerta: Joi.date().required(),
    hora_alerta: Joi.date().required(),
    tipo: Joi.string(),
    nivel_critico: Joi.string().required()
})
export default class CriarAlertaUseCase{
    static async valida(body:CriarAlertaBody){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarAlertaBody):Promise<CriarAlertaResponse>{
        try{
            const {
               
                id_reservatorio,
                data_alerta,
                hora_alerta,
                nivel_critico,
                tipo,
                id_area_alerta
            } = body
            
             // Verifica se já existe um alerta com a mesma data_alerta e id_reservatorio
            const alertaExistente = await Alertas.findOne({
                where: {
                   id_reservatorio: id_reservatorio,
                   data_alerta: data_alerta
                }
            });

            if (alertaExistente) {
                console.log('Alerta já existe para esta data e reservatório:', alertaExistente);
                throw({message:'Alerta já existe', status:http_status.BAD_REQUEST})

            }

            const alerta=await Alertas.create({
                id_reservatorio,
                data_alerta,
                hora_alerta,
                nivel_critico,
                tipo,
                id_area_alerta
            })
            console.log('Resultado do create -=-=-=-= ', alerta)
            return {
                id:alerta.id,
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
            console.log('Erro ao criar alerta -=-=-=-=-==-', err)
            throw(err)
        }
    }
    static async validaBuik(body:CriarAlertaBulkBody){
        try{
            console.log(body)
            const {alertas}=body
            console.log(alertas)
            if(!Array.isArray(alertas)){
                throw({message:"alertas deve ser um array",status:http_status.BAD_REQUEST})
            }


            const alertas_validos = []

            for await (let alerta of alertas){
                await create_body_schema.validateAsync(alerta)
                const alertaExistente = await Alertas.findOne({
                    where: {
                       id_reservatorio: alerta.id_reservatorio,
                       data_alerta: alerta.data_alerta,
                       tipo: alerta.tipo,
                       id_area_alerta: alerta.id_area_alerta
                    }
                });
    
                if (alertaExistente) {
                   continue    
                }
                alertas_validos.push(alerta)
            }
            return alertas_validos
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executaBulk(body:CriarAlertaBulkBody){ 
        const {alertas}=body
        await Alertas.bulkCreate(alertas)
    }
}