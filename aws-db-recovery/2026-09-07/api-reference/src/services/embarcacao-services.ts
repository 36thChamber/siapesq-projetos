import login_use_case from '../use-cases/login'
import criar_use_case from '../use-cases/embarcacoes/criar-embacacao'
import get_use_case from '../use-cases/usuarios/get-usuario'
import update_use_case from '../use-cases/embarcacoes/update-embarcacao'
import { CriarEmbarcacaoBody,UpdateEmbarcacaoBody } from '../types/embarcacao-types';
export default class EmbarcacaoService{
    static async create(body:CriarEmbarcacaoBody){
        try{
            await criar_use_case.valida(body)
            return await criar_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async get(id_embarbacao:number){
        try{
            return await get_use_case.executa(id_embarbacao)
        }
        catch(err){
            throw(err)
        }
    }
    static async update(body:UpdateEmbarcacaoBody,id_embarbacao:number){
        try{
            await update_use_case.valida(body)
            return await update_use_case.executa(body,id_embarbacao)
        }
        catch(err){
            throw(err)
        }
    }
    
}