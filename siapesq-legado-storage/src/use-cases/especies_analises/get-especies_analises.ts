import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import { GetEspeciesAnalisesParamsRequest, GetEspeciesAnalisesResponse } from '../../types/especies_analises-types';
import Especies_analises from '../../models/Especies_analises';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id da especie_analise inválido"))
})
export default class GetEspeciesAnalisesUseCase{
    static async valida(params:GetEspeciesAnalisesParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetEspeciesAnalisesParamsRequest):Promise<GetEspeciesAnalisesResponse>{
        try{
            const { id } = params
            const especie = await Especies_analises.findByPk(id)
            if(!especie){
                throw({
                    message:`Especie ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:especie.id,
                nome_padrao:especie.nome_padrao,
                nome_cientifico: especie.nome_cientifico
            }
        }
        catch(err){
            throw(err)
        }
    }
}