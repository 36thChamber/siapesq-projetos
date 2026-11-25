import {Request,Response} from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum';
import services from '../services/usuarios-services';
import AuthServices from '../services/auth-services';


export default class UsuariosController{
    
    async login(req:Request,res:Response){
        try{
            const {email,senha}=req.body
            const usuario=await services.login({email,senha})
            return res.status(http_status.OK).json(usuario)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async get(req:RequestAutenticado,res:Response){
        try{
            const usuario=await services.get(req.id_usuario)
            return res.status(http_status.OK).json(usuario)
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

    async create(req:Request,res:Response){
        try{
            const {email,senha,documento,insc_capt_portos,telefone,nome }=req.body
            const usuario=await services.create({email,senha, documento,insc_capt_portos,telefone,nome})
            return res.status(http_status.OK).json(usuario)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async update(req:RequestAutenticado,res:Response){
        try{
            const usuario=await services.update(req.body,req.id_usuario)
            return res.status(http_status.OK).json(usuario)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async novoToken(req: RequestAutenticado, res: Response){
        try{
            const usuario = await services.get(req.id_usuario)
            const id = usuario.id
            const segredo=process.env.JWT_SECRET
            if(!segredo){
                throw({
                    message:"JWT_SECRET nao setado",
                    status:http_status.INTERNAL_ERROR
                })
            }
            const novoToken = AuthServices.gera_jwt_token({id}, segredo)
            
            return res.status(http_status.OK).json({
                id:id,
                nome: usuario.nome,
                email:usuario.email,
                documento:usuario.documento,
                insc_capt_portos: usuario.insc_capt_portos,
                telefone: usuario.telefone,
                token: novoToken,
            })
        } catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}