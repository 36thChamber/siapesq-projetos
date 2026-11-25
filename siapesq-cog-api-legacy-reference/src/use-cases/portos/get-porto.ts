import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Portos from '../../models/Portos';
import { GetPortoParamsRequest,GetPortoResponse } from '../../types/portos-types';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do porto inválido"))
})
export default class GetPortoUseCase{
    static async valida(params:GetPortoParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetPortoParamsRequest):Promise<GetPortoResponse>{
        try{
            const { id } = params
            const porto = await Portos.findByPk(id)
            if(!porto){
                throw({
                    message:`Porto ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:porto.id,
                nome:porto.nome,
                ativo:porto.ativo,
                criado_em:porto.criado_em,
                atualizado_em:porto.atualizado_em,
                deletado_em:porto.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}