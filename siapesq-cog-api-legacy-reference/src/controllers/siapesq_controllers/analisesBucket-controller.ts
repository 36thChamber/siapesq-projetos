import { Response, query } from 'express';
import { RequestAutenticado } from '../../types/express-types';
import http_status from '../../consts/http-status-enum'
import AWS_S3_REPOSITORY from '../../repositories/aws-s3-repository';
import ListarAnalises from '../../use-cases/siapesq_use-cases/Analises_Bucket/listar-analises';
import DownloadAnalises from '../../use-cases/siapesq_use-cases/Analises_Bucket/download-analises';
import DownloadCsvAnalises from '../../use-cases/siapesq_use-cases/Analises_Bucket/downloadCsv-analises';
export default class  AnalisesController{
    async list(req:RequestAutenticado,res:Response){
        try{
            const aws_bucken_repo=new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION)
            const bucket_name=process.env.AWS_TIFF_STE ? process.env.AWS_TIFF_STE: ""
            const aws_pagination_token=req.query.pagination_token ? String(req.query.pagination_token):undefined
            await ListarAnalises.valida(bucket_name,aws_pagination_token)
            const objetos=await ListarAnalises.executa(bucket_name,aws_bucken_repo,aws_pagination_token)
            return res.status(http_status.OK).json(objetos)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    
    async get(req:RequestAutenticado,res:Response){
        try{
            const aws_bucken_repo=new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION)
            const bucket_name=process.env.AWS_TIFF_STE ? process.env.AWS_TIFF_STE: ""
            const object_name =String(req.query.object_name)
            await DownloadAnalises.valida(bucket_name,object_name)
            const readstream=await DownloadAnalises.executa(bucket_name,object_name,aws_bucken_repo)
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

    async getCsv(req:RequestAutenticado,res:Response){
        try{
            const aws_bucken_repo=new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION)
            const bucket_name=process.env.AWS_TIFF_STE ? process.env.AWS_TIFF_STE: ""
            const object_name =String(req.query.object_name)
            await DownloadCsvAnalises.valida(bucket_name,object_name)
            const readstream=await DownloadCsvAnalises.executa(bucket_name,object_name,aws_bucken_repo)
            res.status(200)
            res.contentType("text/csv")
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


