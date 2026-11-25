import Joi from 'joi';
import Embarcacao from '../../models/Embarcacoes';
import { UpdateEmbarcacaoBody,UpdateEmbarcacaoResponse } from '../../types/embarcacao-types';
import AuthServices from '../../services/auth-services';
import http_status from '../../consts/http-status-enum';
const update_usuario_schema=Joi.object({
    nome:Joi.string().required().error(new Error("Nome invalido")),
    RGP:Joi.string().required().error(new Error("RGP invalido")),
    tamanho:Joi.string().required().error(new Error("tamanho invalido")),
    capacidade_estocagem:Joi.number().required().error(new Error("Capacidade invalido")),
    velocidade_pesca:Joi.number().required().error(new Error("Velocidade invalido")),
    velocidade_cruzeiro:Joi.number().required().error(new Error("Velocidade invalido")),
    modalidade_pesca:Joi.string().required().error(new Error("Modalidade invalido")),
    area_pesca:Joi.string().required().error(new Error("Area invalido")),
    imagem:Joi.string().required().error(new Error("Imagem invalido"))
})
export default class UpdateEmbarbacaoUseCase{
    static async valida(body:UpdateEmbarcacaoBody){
        try{
            await update_usuario_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:UpdateEmbarcacaoBody,id_embarcacao:number):Promise<UpdateEmbarcacaoResponse>{
        try{
            const embarcacao=await Embarcacao.findByPk(id_embarcacao)
            if(!embarcacao){
                throw({
                    message:`Embarcacao(${id_embarcacao}) não encontrado`,
                    status:404
                })
            }
            await embarcacao.update(body)
            return {
                id:embarcacao.id,
                nome:embarcacao.nome,
                RGP:embarcacao.RGP,
                id_mestre:embarcacao.id_mestre,
                tamanho:embarcacao.tamanho,
                ativo: embarcacao.ativo,
                capacidade_estocagem:embarcacao.capacidade_estocagem,
                velocidade_pesca:embarcacao.velocidade_pesca,
                velocidade_cruzeiro:embarcacao.velocidade_cruzeiro,
                modalidade_pesca:embarcacao.modalidade_pesca,
                area_pesca:embarcacao.area_pesca,
                imagem:embarcacao.imagem,
                criado_em:embarcacao.criado_em,
                atualizado_em:embarcacao.atualizado_em,
                deletado_em:embarcacao.deletado_em,
            }
            
        }
        catch(err){
            throw(err)
        }
    }
}