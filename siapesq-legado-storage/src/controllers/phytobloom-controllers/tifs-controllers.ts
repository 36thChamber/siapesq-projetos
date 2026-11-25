import { Response, query } from 'express';
import { RequestAutenticado } from '../../types/express-types';
import http_status from '../../consts/http-status-enum'
import AWS_S3_REPOSITORY from '../../repositories/aws-s3-repository';
import ListarTif from '../../use-cases/phytonbloom_use-cases/tifs/listar-tifs'
import DownloadTif from '../../use-cases/phytonbloom_use-cases/tifs/download-tif';

export default class  TifsControllers{
    async listar(req:RequestAutenticado,res:Response){
        try{
            const aws_bucken_repo=new AWS_S3_REPOSITORY("COPEL")
            const bucket_name=aws_bucken_repo.bucket
            const aws_pagination_token=req.query.pagination_token ? String(req.query.pagination_token):undefined
            await ListarTif.valida(bucket_name,aws_pagination_token)
            const objetos=await ListarTif.executa(bucket_name,aws_bucken_repo,aws_pagination_token)
            return res.status(http_status.OK).json(objetos)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    
    async download(req:RequestAutenticado,res:Response){
        try{
            const aws_bucken_repo=new AWS_S3_REPOSITORY("COPEL")
            const bucket_name=aws_bucken_repo.bucket
            const object_name =String(req.query.object_name)
            await DownloadTif.valida(bucket_name,object_name)
            const readstream=await DownloadTif.executa(bucket_name,object_name,aws_bucken_repo)
            res.status(200)
            res.contentType("image/tif")
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


