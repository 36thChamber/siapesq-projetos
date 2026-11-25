import { Response, query } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import ListarPng from '../use-cases/mapas/listar-png';
import DownloadPng from '../use-cases/mapas/download-png';
import AWS_S3_REPOSITORY from '../repositories/aws-s3-repository';
export default class  MapasController{
    async list(req:RequestAutenticado,res:Response){
        try{
            const aws_bucken_repo=new AWS_S3_REPOSITORY("MAPAS")
            const bucket_name=aws_bucken_repo.bucket
            const aws_pagination_token=req.query.pagination_token ? String(req.query.pagination_token):undefined
            await ListarPng.valida(bucket_name,aws_pagination_token)
            const objetos=await ListarPng.executa(bucket_name,aws_bucken_repo,aws_pagination_token)
            return res.status(http_status.OK).json(objetos)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    
    async get(req:RequestAutenticado,res:Response){
        try{
            const aws_bucken_repo=new AWS_S3_REPOSITORY("MAPAS")
            const bucket_name=aws_bucken_repo.bucket
            const object_name =String(req.query.object_name)
            await DownloadPng.valida(bucket_name,object_name)
            const readstream=await DownloadPng.executa(bucket_name,object_name,aws_bucken_repo)
            res.status(200)
            res.contentType("image/png")
            const writestream=new WritableStream({
                write(chunk){res.write(chunk,(err)=>{if(err) res.status(http_status.INTERNAL_ERROR).json(err)})},
                close(){res.end()}
            })
            await readstream?.pipeTo(writestream)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}


