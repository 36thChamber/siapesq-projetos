import login_use_case from '../use-cases/phytonbloom_use-cases/login'
import criar_use_case from '../use-cases/phytonbloom_use-cases/usuarios/criar-usuario'
import get_use_case from '../use-cases/phytonbloom_use-cases/usuarios/get-usuario'
import update_use_case from '../use-cases/phytonbloom_use-cases/usuarios/update-usuario'
import delete_use_case from '../use-cases/phytonbloom_use-cases/usuarios/delete-usuario'
import { UsuarioLoginRequestBody, CriarUsuarioBody,UpdateUsuarioBody, DeleteUsuarioBody } from '../types/phytobloom-types/usuarios-types';
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
    static async update(body:UpdateUsuarioBody,id_usuario:number){
        try{
            await update_use_case.valida(body)
            return await update_use_case.executa(body,id_usuario)
        }
        catch(err){
            throw(err)
        }
    }
    static async delete(body:DeleteUsuarioBody){
        try{
            await delete_use_case.valida(body)
            return await delete_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
}