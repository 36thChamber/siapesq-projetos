import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import { GetServidorParamsRequest,GetServidorResponse } from '../../../types/phytobloom-types/servidores-types'
import Servidores from '../../../models/phytoBloom/Servidores';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do servidor inválido"))
})
export default class GetServidorUseCase{
    static async valida(params:GetServidorParamsRequest){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:GetServidorParamsRequest):Promise<GetServidorResponse>{
        try{
            const { id } = params
            const servidor = await Servidores.findByPk(id)
            if(!servidor){
                throw({
                    message:`servidor ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id:servidor.id,
                nome:servidor.nome,
                id_usuario:servidor.id_usuario,
                email:servidor.email,
                cpf:servidor.cpf,
                criado_em:servidor.criado_em,
                atualizado_em:servidor.atualizado_em,
                deletado_em:servidor.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}