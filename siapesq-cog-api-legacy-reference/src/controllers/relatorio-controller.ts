import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import SalvarDadosRelatorioUseCase from '../use-cases/relatorio/salvar-dados-relatorio';
import UploadRelatorioUseCase from '../use-cases/relatorio/upload-relatorio';
export default class RelatorioController{
    async salvar(req:RequestAutenticado,res:Response){
        try{
            /*ENDPOINT VAI SALVAR TODAS AS INFORMAÇOES DO PDF NO BANCO*/
            await SalvarDadosRelatorioUseCase.valida(req.body)
            const relatorio= await SalvarDadosRelatorioUseCase.executa(req.body)
            return res.status(http_status.OK).json(relatorio)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async upload(req:RequestAutenticado,res:Response){
        try{
            /*Faz upload do pdf pra aws*/
            if(!req.file){
                throw({
                    message:"Arquivo PDF não enviado",
                    status:http_status.BAD_REQUEST
                })
            }
            await UploadRelatorioUseCase.valida(req.body,req.file)
            const relatorio= await UploadRelatorioUseCase.executa(req.body,req.file)
            return res.status(http_status.OK).json(relatorio)
        }
        catch(err:any){
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
  
}


