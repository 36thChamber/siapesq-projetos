
import {Request,Response} from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum';
import services from '../services/usuariosAtivos-services';
import ListandoUsuariosAtivos from '../use-cases/usuariosAtivos/list-usuariosAtivos';

export default class UsuariosAtivosController{
   
    async list(req:RequestAutenticado,res:Response){
       try{
            let {limit,offset}=req.query
            if(limit&&typeof limit!=='string'){
                throw({})
            }
            if(offset&&typeof offset!=='string'){
                throw({})
            }
            const query={
                limit: limit ? parseInt(limit):10000,
                offset: offset ? parseInt(offset):0
            }
            await ListandoUsuariosAtivos.valida(query)
            const lista=await ListandoUsuariosAtivos.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    
    async getId(req:RequestAutenticado,res:Response){
        try{
            const id = parseInt(req.params.id)
            const usuario=await services.get(id)
            return res.status(http_status.OK).json(usuario)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async create(req:RequestAutenticado,res:Response){
        try{
   
            const {id_user,email,telefone, tipo_assinatura, ativo, data_criacao,data_fim }=req.body
            const usuario=await services.create({id_user,email,telefone,tipo_assinatura, ativo,data_criacao,data_fim})
            return res.status(http_status.OK).json(usuario)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
     async update(req:RequestAutenticado,res:Response){
         try{
             const usuario=await services.update(req.body)
             return res.status(http_status.OK).json(usuario)
         }
         catch(err:any){
             const statusCode = err.status || http_status.INTERNAL_ERROR
             return res.status(statusCode).json(err)
         }
     }
     async delete(req:RequestAutenticado,res:Response){
        try{
            const usuario=await services.delete(req.body)
            return res.status(http_status.OK).json(usuario)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}