import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import Especies from '../../models/Especies';
import { CriarEspecieBodyRequest,CriarEspecieResponse } from '../../types/especies-types'
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(()=>new Error("Nome da especie não informado")),
    imagem:Joi.string().required().error(()=>new Error("URL da Imagem da especie não informado"))
})
export default class CriarEspecieUseCase{
    static async valida(body:CriarEspecieBodyRequest){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarEspecieBodyRequest):Promise<CriarEspecieResponse>{
        try{
            const especie = await Especies.create(body)
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