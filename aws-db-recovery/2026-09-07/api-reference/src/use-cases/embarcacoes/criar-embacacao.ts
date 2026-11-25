import Joi from 'joi'
import { CriarEmbarcacaoBody,CriarEmbarcacaoResponse, } from '../../types/embarcacao-types';
import http_status from '../../consts/http-status-enum';
import Embarcacao from '../../models/Embarcacoes';
const create_body_schema=Joi.object({
    nome:Joi.string().required().error(new Error("Nome invalido")),
    id_mestre:Joi.number().required().error(new Error("id_mestre invalido")),
    RGP:Joi.string().required().error(new Error("RGP invalido")),
    tamanho:Joi.string().error(new Error("tamanho invalido")),
    capacidade_estocagem:Joi.number().error(new Error("Capacidade invalido")),
    velocidade_pesca:Joi.number().error(new Error("Velocidade invalido")),
    velocidade_cruzeiro:Joi.number().error(new Error("Velocidade invalido")),
    modalidade_pesca:Joi.string().error(new Error("Modalidade invalido")),
    area_pesca:Joi.string().error(new Error("Area invalido")),
    imagem:Joi.string().error(new Error("Imagem invalido"))
})
export default class LoginUseCase{
    static async valida(body:CriarEmbarcacaoBody){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarEmbarcacaoBody):Promise<CriarEmbarcacaoResponse>{
        try{
            const {    
                nome,
                RGP,
                id_mestre,
                tamanho,
                capacidade_estocagem,
                velocidade_pesca,
                velocidade_cruzeiro,
                modalidade_pesca,
                area_pesca,
                imagem,
            } = body
            const rgp_existe=await Embarcacao.findOne({where:{RGP}})
            if(rgp_existe){
                throw({
                    message:`Embarcação ${nome} ja foi cadastrado`,
                    status:http_status.CONFLICT
                })
            }
            const embarcacao=await Embarcacao.create({
                nome,
                RGP,
                id_mestre,
                tamanho,
                capacidade_estocagem,
                velocidade_pesca,
                velocidade_cruzeiro,
                modalidade_pesca,
                area_pesca,
                imagem,
            })
            return {
                id:embarcacao.id,
                nome,
                RGP,
                id_mestre,
                tamanho,
                capacidade_estocagem,
                velocidade_pesca,
                velocidade_cruzeiro,
                modalidade_pesca,
                area_pesca,
                imagem,
            }
        }
        catch(err){
            throw(err)
        }
    }
}