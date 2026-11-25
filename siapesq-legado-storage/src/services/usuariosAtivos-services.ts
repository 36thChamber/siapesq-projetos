import criar_use_case from '../use-cases/usuariosAtivos/criar-usuarioAtivo'
import get_use_case from '../use-cases/usuariosAtivos/get-usuarioAtivo'
import delete_use_case from '../use-cases/usuariosAtivos/delete-usuarioAtivo'
import update_use_case from '../use-cases/usuariosAtivos/update-usuarioAtivo'

import { CriarUsuarioAtivoBody, DeleteUsuarioAtivoBody, UpdateUsuarioAtivoBody } from '../types/usuariosAtivos-types';
export default class UsuariosAtivosService{
   
    static async create(body:CriarUsuarioAtivoBody){
        try{
            await criar_use_case.valida(body)
            return await criar_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async get(id_usuario:number){
        try{
            return await get_use_case.executa(id_usuario)
        }
        catch(err){
            throw(err)
        }
    }
     static async update(body:UpdateUsuarioAtivoBody){
         try{
             await update_use_case.valida(body)
             return await update_use_case.executa(body)
         }
         catch(err){
             throw(err)
         }
     }
     static async delete(body:DeleteUsuarioAtivoBody){
        try{
            await delete_use_case.valida(body)
            return await delete_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    
}