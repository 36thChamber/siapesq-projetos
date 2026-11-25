import Embarcacoes from '../../models/Embarcacoes';
import { GetEmbarcacaoResponse } from '../../types/embarcacao-types';
import http_status from '../../consts/http-status-enum';
import Joi from 'joi';
const req_params_schema=Joi.object({
    id:Joi.number().required().error(()=>new Error("id do fundo inválido"))
})
export default class GetEmbarcacaoUseCase{
    
    static async valida(params:{id:number}){
        try{
            await req_params_schema.validateAsync(params)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(params:{id:number}):Promise<GetEmbarcacaoResponse>{
        try{
            const { id } = params
            const embarcacao = await Embarcacoes.findByPk(id)
            if(!embarcacao){
                throw({
                    message:`Embarcação ${id} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            return {
                id: embarcacao.id,
                nome: embarcacao.nome,
                RGP: embarcacao.RGP,
                id_mestre: embarcacao.id_mestre,
                tamanho: embarcacao.tamanho,
                capacidade_estocagem: embarcacao.capacidade_estocagem,
                velocidade_pesca: embarcacao.velocidade_pesca,
                velocidade_cruzeiro: embarcacao.velocidade_cruzeiro,
                modalidade_pesca: embarcacao.modalidade_pesca,
                area_pesca: embarcacao.area_pesca,
                imagem: embarcacao.imagem,
                ativo: embarcacao.ativo,
                criado_em: embarcacao.criado_em,
                atualizado_em: embarcacao.atualizado_em,
                deletado_em: embarcacao.deletado_em
            }
        }
        catch(err){
            throw(err)
        }
    }
}