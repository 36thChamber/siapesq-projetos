import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import { SalvarDadosRelatorioBodyRequest} from '../../types/relatorios-types';
import EspecieLance from '../../models/EspecieLance';
import EspecieMissaoAlvo from '../../models/EspecieMissaoAlvo';
import EntradaPortos from '../../models/EntradaPortos';
import SaidaPortos from '../../models/SaidaPortos';
import Missoes from '../../models/Missoes';
import Lances from '../../models/Lances';
import EspecieDescartes from '../../models/EspecieDescartes';
import EspecieIncidentais from '../../models/EspecieIncidentais';
const ARMADILHA=[1]
const ESPINHEL=[6,7,8,9]
const CERCO=[11,12]
const EMALHA=[13,14]
const create_body_schema=Joi.object({
    nome_armador:Joi.string().required(),
    id_embarcacao:Joi.number().required(),
    id_arte_de_pesca:Joi.number().required(),
    id_usuario:Joi.number().required(),
    porto_chegada:Joi.number().required(),
    porto_saida:Joi.number().required(),
    data_chegada:Joi.date().required(),
    data_saida:Joi.date().required(),
    especie_alvo:Joi.array().items(Joi.number()).required(),
    dados_pescaria:Joi.array().items(
        Joi.object({
            data:Joi.date().required(),
            latitude_inicial:Joi.number().required(),
            longitude_inicial:Joi.number().required(),
            latitude_final:Joi.number().required(),
            longitude_final:Joi.number().required(),
            inicio_arrasto:Joi.date().required(), 
            final_arrasto:Joi.date().required(),
            profundidade:Joi.number().required(),
            
            especies:Joi.array().items(
                Joi.object({
                    id:Joi.number().optional(),
                    quantidade:Joi.number().optional(),
                    peso:Joi.number().optional()
                })
            ),
            //armadilha
            n_lance_armadilhas:Joi.number().optional(),
            n_recolha_armadilhas:Joi.number().optional(),
            id_fundo: Joi.number().optional(),
            //espinhel e armadilha
            id_isca: Joi.number().optional(),
            //espinhel            
            n_anzois: Joi.number().optional(),
            n_samburas: Joi.number().optional(),
            n_anzois_recolha: Joi.number().optional(),
            n_samburas_recolha: Joi.number().optional(),
            light_stick:Joi.boolean().optional(),
            profundidade_recolha:Joi.number().optional(),

            //espinhel e cerco
            temperatura_superficie: Joi.number().optional(),
            temperatura_superficie_recolha: Joi.number().optional(),

            //cerco
            tempo_procura_minutos: Joi.number().optional(),
            //emalha
            comprimento_total_rede:Joi.number().optional(),
            altura_total_rede:Joi.number().optional(),
            tamanho_malha:Joi.number().optional(),

            //emalhe
            dados_incidentais_emalhe:Joi.array().items(
                Joi.object({
                    nome:Joi.string().optional(),
                    quantidade:Joi.number().optional()
                })
            ),
            //espinhel
            dados_incidentais_espinhel:Joi.array().items(
                Joi.object({
                    nome:Joi.string().optional(),
                    vivos:Joi.number().optional(),
                    mortos:Joi.number().optional()
                })
            ),
            //espinhel
            dados_descartes:Joi.array().items(
                Joi.object({
                    id:Joi.number().optional(),
                    vivos:Joi.number().optional(),
                    mortos:Joi.number().optional()
                })
            )
        })
    ).required(),
})
export default class SalvarDadosRelatorioUseCase{
static async valida(body:SalvarDadosRelatorioBodyRequest){
    try{
        await create_body_schema.validateAsync(body);
    }
    catch(err:any){
        throw({message:err.message,status:http_status.BAD_REQUEST})
    }
} 
static async executa(body:SalvarDadosRelatorioBodyRequest):Promise<any>{
        try{
           const {
                id_embarcacao,
                nome_armador,
                especie_alvo,
                porto_chegada,
                porto_saida,
                data_chegada,
                data_saida,
                dados_pescaria,
                id_arte_de_pesca
            } = body
            if (ARMADILHA.includes(id_arte_de_pesca)){
                try{
                    const armadilha_schema=Joi.array().items(
                        Joi.object({
                            data:Joi.date().required(),
                            latitude_inicial:Joi.number().required(),
                            longitude_inicial:Joi.number().required(),
                            latitude_final:Joi.number().required(),
                            longitude_final:Joi.number().required(),
                            inicio_arrasto:Joi.date().required(), 
                            final_arrasto:Joi.date().required(),
                            profundidade:Joi.number().required(),
                            especies:Joi.array().items(
                                Joi.object({
                                    id:Joi.number().required(),
                                    peso:Joi.number().required()
                                })
                            ),
                            
                            n_lance_armadilhas:Joi.number().required(),
                            n_recolha_armadilhas:Joi.number().required(),
                            id_fundo: Joi.number().optional(),
                            id_isca: Joi.number().optional(),
                        })
                    )
                    await armadilha_schema.validateAsync(dados_pescaria)
                }
                catch(err:any){
                    throw({message:err.message,status:http_status.BAD_REQUEST})
                }
            } else if (ESPINHEL.includes(id_arte_de_pesca)){
                try{
                    const espinhel=Joi.array().items(
                        Joi.object({
                            data:Joi.date().required(),
                            latitude_inicial:Joi.number().required(),
                            longitude_inicial:Joi.number().required(),
                            latitude_final:Joi.number().required(),
                            longitude_final:Joi.number().required(),
                            inicio_arrasto:Joi.date().required(), 
                            final_arrasto:Joi.date().required(),
                            profundidade:Joi.number().required(),
                            profundidade_recolha:Joi.number().optional(),
                            especies:Joi.array().items(
                                Joi.object({
                                    id:Joi.number().optional(),
                                    quantidade:Joi.number().optional(),
                                    peso:Joi.number().optional()
                                })
                            ),
                            id_isca:Joi.number().optional(),
                            light_stick:Joi.boolean().optional(),
                            n_anzois: Joi.number().required(),
                            n_samburas: Joi.number().required(),
                            n_anzois_recolha:Joi.number().required(),
                            n_samburas_recolha:Joi.number().required(),

                            temperatura_superficie: Joi.number().required(),
                            temperatura_superficie_recolha:Joi.number().required(),

                            dados_incidentais_espinhel:Joi.array().items(
                                Joi.object({
                                    nome:Joi.string().optional(),
                                    vivos:Joi.number().optional(),
                                    mortos:Joi.number().optional()
                                })
                            ),
                            dados_descartes:Joi.array().items(
                                Joi.object({
                                    id:Joi.number().optional(),
                                    vivos:Joi.number().optional(),
                                    mortos:Joi.number().optional()
                                })
                            )
                        })
                    )
                    await espinhel.validateAsync(dados_pescaria)
                }
                catch(err:any){
                    throw({message:err.message,status:http_status.BAD_REQUEST})
                }
            } else if (CERCO.includes(id_arte_de_pesca)){
                try{
                    const cerco=Joi.array().items(
                        Joi.object({
                            data:Joi.date().required(),
                            latitude_inicial:Joi.number().required(),
                            longitude_inicial:Joi.number().required(),
                            latitude_final:Joi.number().required(),
                            longitude_final:Joi.number().required(),
                            inicio_arrasto:Joi.date().required(), 
                            final_arrasto:Joi.date().required(),
                            profundidade:Joi.number().required(),
                            especies:Joi.array().items(
                                Joi.object({
                                    id:Joi.number().required(),
                                    quantidade:Joi.number().required(),
                                    peso:Joi.number().required()
                                })
                            ),
                            tempo_procura_minutos: Joi.date().required(),
                            temperatura_superficie: Joi.number().required(),
                        })
                    )
                    await cerco.validateAsync(dados_pescaria)
                }
                catch(err:any){
                    throw({message:err.message,status:http_status.BAD_REQUEST})
                }
            } else if (EMALHA.includes(id_arte_de_pesca)){
                try{
                    const emalha=Joi.array().items(
                        Joi.object({
                            data:Joi.date().required(),
                            latitude_inicial:Joi.number().required(),
                            longitude_inicial:Joi.number().required(),
                            latitude_final:Joi.number().required(),
                            longitude_final:Joi.number().required(),
                            inicio_arrasto:Joi.date().required(), 
                            final_arrasto:Joi.date().required(),
                            profundidade:Joi.number().required(),
                            especies:Joi.array().items(
                                Joi.object({
                                    id:Joi.number().required(),
                                    quantidade:Joi.number().optional(),
                                    peso:Joi.number().required()
                                })
                            ),

                            comprimento_total_rede:Joi.number().required(),
                            altura_total_rede:Joi.number().required(),
                            tamanho_malha:Joi.number().required(),
                            dados_incidentais_emalhe:Joi.array().items(
                                Joi.object({
                                    nome:Joi.string().optional(),
                                    quantidade:Joi.number().optional()
                                })
                            )
                        })
                    )
                    await emalha.validateAsync(dados_pescaria)
                }
                catch(err:any){
                    throw({message:err.message,status:http_status.BAD_REQUEST})
                }
            } else{
                throw({message:'Arte de pesca não encontrada',status:http_status.BAD_REQUEST})
            }
           await EntradaPortos.create({
                id_embarcacao,
                id_porto:porto_saida,
                entrada:data_saida
           })
           await SaidaPortos.create({
                id_embarcacao,
                id_porto:porto_chegada,
                entrada:data_chegada
           })
           const missao = await Missoes.create({
                id_embarcacao,
                nome_armador,
                iniciou_em:data_chegada,
                terminou_em:data_saida,
                id_arte_de_pesca
           })

           await Promise.all(
                especie_alvo.map(async id_especie=>{
                    EspecieMissaoAlvo.create({
                        id_especie,
                        id_missao:missao.id
                    })                    
                })
           )
           await Promise.all(
                dados_pescaria.map(async(lanceData)=>{
                    const lance=await Lances.create({
                        id_missao:missao.id,
                        id_arte:id_arte_de_pesca,
                        lancado_em:lanceData.inicio_arrasto,
                        recolhido_em:lanceData.final_arrasto,
                        latitude_lancamento:lanceData.latitude_inicial,
                        longitude_lancamento:lanceData.longitude_inicial,
                        latitude_recolhimento:lanceData.latitude_final,
                        longitude_recolhimento:lanceData.longitude_final,
                        profundidade:lanceData.profundidade,
                        profundidade_recolha: lanceData.profundidade_recolha,
                        n_lance_armadilhas:lanceData.n_lance_armadilhas,
                        n_recolha_armadilhas:lanceData.n_recolha_armadilhas,
                        id_isca:lanceData.id_isca,
                        id_fundo:lanceData.id_fundo,
                        light_stick:lanceData.light_stick,
                        id_armadilha:lanceData.id_armadilha,
                        n_lance_anzois:lanceData.n_anzois,
                        n_lance_samburas:lanceData.n_samburas,
                        n_recolha_anzois: lanceData.n_anzois_recolha,
                        n_recolha_samburas: lanceData.n_samburas_recolha,
                        temperatura_superficie:lanceData.temperatura_superficie,
                        temperatura_superficie_recolha:lanceData.temperatura_superficie_recolha,
                        tempo_procura_minutos:lanceData.tempo_procura_minutos,
                        comprimento_total_rede:lanceData.comprimento_total_rede,
                        altura_total_rede:lanceData.altura_total_rede,
                        tamanho_malha:lanceData.tamanho_malha,
                        dados_incidentais_emalhe: lanceData.dados_incidentais_emalhe,
                        dados_incidentais_espinhel: lanceData.dados_incidentais_espinhel,
                        dados_descartes: lanceData.dados_descartes,
                        ativo: true,
                        criado_em:new Date(),
                        atualizado_em:new Date(),
                    })
                    await Promise.all(
                        lanceData.especies.map(async especie=>{
                            await EspecieLance.create({
                                id_lance:lance.id,
                                id_especie:especie.id,
                                quantidade:especie.quantidade,
                                peso:especie.peso
                            })
                        })
                    )

                    if(ESPINHEL.includes(id_arte_de_pesca)) {
                        await Promise.all(
                        lanceData.dados_descartes.map(async descartes=>{
                            await EspecieDescartes.create({
                                id_especie: descartes.id,
                                id_lance:lance.id,
                                n_de_vivos: descartes.vivos,
                                n_de_mortos: descartes.mortos
                            })
                        })
                    )

                    await Promise.all(
                        lanceData.dados_incidentais_espinhel.map(async incidente=>{
                            await EspecieIncidentais.create({
                                id_lance:lance.id,
                                nome_especie: incidente.nome,
                                quantidade: null,
                                n_de_vivos: incidente.vivos,
                                n_de_mortos: incidente.mortos,
                                acidental: true
                            })
                        })
                    )
                    } else if(EMALHA.includes(id_arte_de_pesca)){
                        await Promise.all(
                        lanceData.dados_incidentais_emalhe.map(async incidente=>{
                            await EspecieIncidentais.create({
                                id_lance:lance.id,
                                nome_especie: incidente.nome,
                                quantidade: incidente.quantidade,
                                n_de_vivos: null,
                                n_de_mortos: null,
                                acidental: true
                            })
                        })
                    )
                    }            
                    
                })
            )
        }
        catch(err){
            throw(err)
        }
    }
}