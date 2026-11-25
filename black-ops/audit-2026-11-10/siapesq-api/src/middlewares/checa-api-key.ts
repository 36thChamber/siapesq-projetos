import {Response,NextFunction} from 'express'
import http_status from '../consts/http-status-enum'
import checa_token from './checa-token'
export default function  checa_api_key(req:any,res:Response,next:NextFunction){
    try{
        const api_key=req.headers["x-api-key"]
        if(!api_key){
            checa_token(req,res,next)
            return
        }
        const key=process.env.API_KEY
        if(!key){
            throw({
                message:"API_KEY não definido",
                status:http_status.INTERNAL_ERROR
            })
        }
        if(api_key!==key){
            throw({message:"API_KEY inválida",status:http_status.UNAUTHORIZED})
        }
        
        next()
    }
    catch(err:any){
        const statusCode = err.status || http_status.INTERNAL_ERROR
        return res.status(statusCode).json(err)
    }
}
