import {Response,NextFunction} from 'express'
import AuthServices from '../services/auth-services'
import http_status from '../consts/http-status-enum'
export default function  checa_token(req:any,res:Response,next:NextFunction){
    try{
        const header=req.headers.authorization
        if(!header){
            throw({
                message:"header authorization é indefinido",
                status:http_status.UNAUTHORIZED
            })
        }
        const [_,token] = header.split(" ")
        if(!token){
            throw({
                message:"token é indefinido",
                status:http_status.UNAUTHORIZED
            })
        }
        const segredo=process.env.JWT_SECRET
        if(!segredo){
            throw({
                message:"JWT_SECRET não definido",
                status:http_status.INTERNAL_ERROR
            })
        }
        const usuario = AuthServices.decoda_jwt_token(token,segredo)
        const { id } = usuario
        req.id_usuario = id;
        next()
    }
    catch(err:any){
        const statusCode = err.status || http_status.INTERNAL_ERROR
        return res.status(statusCode).json(err)
    }
}