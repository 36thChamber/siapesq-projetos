import login_use_case from '../use-cases/login'
import criar_use_case from '../use-cases/usuarios/criar-usuario'
import get_use_case from '../use-cases/usuarios/get-usuario'
import update_use_case from '../use-cases/usuarios/update-usuario'
import { UsuarioLoginRequestBody, CriarUsuarioBody,UpdateUsuarioBody } from '../types/usuarios-types';


export default class UsuariosService{
    static async login(body:UsuarioLoginRequestBody){
        try{
            await login_use_case.valida(body)
            return await login_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async create(body:CriarUsuarioBody){
        try{
            await criar_use_case.valida(body)
            return await criar_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async get(id_usuario:number | string){
        try{
            return await get_use_case.executa(id_usuario)
        }
        catch(err){
            throw(err)
        }
    }
    static async update(body:UpdateUsuarioBody,id_usuario:number | string){
        try{
            await update_use_case.valida(body)
            return await update_use_case.executa(body,id_usuario)
        }
        catch(err){
            throw(err)
        }
    }
}