import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import ArtesDePesca from '../../models/ArtesDePesca';
import { GetArtesDePescaParamsRequest, GetArtesDePescaResponse } from '../../types/artesDePesca-types';

const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id de Artes de pesca inválido"))
})
export default class GetArtesDePescaUseCase{
    static async valida(params:GetArtesDePescaParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetArtesDePescaParamsRequest):Promise<GetArtesDePescaResponse>{
        try{
            const { id } = params
            const artesDePesca = await ArtesDePesca.findByPk(id)
            if(!artesDePesca){
                throw({
                    message:`ArtesDePesca ${id} não encontrada`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id: artesDePesca.id,
                missoes: artesDePesca.missoes,
                nome: artesDePesca.nome,
                ativo: artesDePesca.ativo,
                criado_em: artesDePesca.criado_em,
                atualizado_em: artesDePesca.atualizado_em,
                deletado_em: artesDePesca.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}