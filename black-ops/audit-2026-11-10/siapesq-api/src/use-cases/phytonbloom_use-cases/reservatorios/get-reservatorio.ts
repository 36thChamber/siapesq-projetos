import Reservatorios from '../../../models/phytoBloom/Reservatorios';
import { GetReservatorioResponse } from '../../../types/phytobloom-types/reservatorios-types'
import http_status from '../../../consts/http-status-enum';
import Joi from 'joi';
import Areas_Alertas from '../../../models/phytoBloom/Areas_Alertas';
import Alertas from '../../../models/phytoBloom/Alertas';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do reservatorio inválido"))
})
export default class GetReservatorioUseCase{
    
    static async valida(params:{id:number}){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:{id:number}):Promise<GetReservatorioResponse>{
        try{
            const { id } = params
            const reservatorio = await Reservatorios.findByPk(id)
            const areas = await Areas_Alertas.findAll({where: {
                id_reservatorio: id
            }, include: {model: Alertas, as: 'alertas'}})

            if(!reservatorio){
                throw({
                    message:`Reservatorio ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            if(!areas){
                throw({
                    message:`Nenhuma area encontrada`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id: reservatorio.id,
                id_usuario: reservatorio.id_usuario,
                nome: reservatorio.nome,
                prioridade: reservatorio.prioridade,
                posicoes: reservatorio.posicoes,
                areas_alertas: areas,
                criado_em: reservatorio.criado_em,
                atualizado_em: reservatorio.atualizado_em,
                deletado_em: reservatorio.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}