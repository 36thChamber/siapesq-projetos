import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Especies from '../../models/Especies';
import { GetEspecieParamsRequest,GetEspecieResponse } from '../../types/especies-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id da especie inválido"))
})
export default class GetEspecieUseCase{
    static async valida(params:GetEspecieParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetEspecieParamsRequest):Promise<GetEspecieResponse>{
        try{
            const { id } = params
            const especie = await Especies.findByPk(id)
            if(!especie){
                throw({
                    message:`Especie ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:especie.id,
                nome:especie.nome,
                imagem:especie.imagem,
                ativo:especie.ativo,
                criado_em:especie.criado_em,
                atualizado_em:especie.atualizado_em,
                deletado_em:especie.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}