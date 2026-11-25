import Relatorios from "../models/Relatorios";
import ObjectStorage from "../repositories/aws-s3-repository";
import { pipeline } from "node:stream/promises";
import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import SalvarDadosRelatorioUseCase from '../use-cases/relatorio/salvar-dados-relatorio';
import UploadRelatorioUseCase from '../use-cases/relatorio/upload-relatorio';
export default class RelatorioController{
    async arquivo(req:RequestAutenticado,res:Response) {
        const key = req.params.key;
        if (!/^[0-9a-f-]{36}\.pdf$/i.test(key)) return res.sendStatus(404);
        try {
            const uri = "https://api.example.invalid/v1/relatorios/arquivo/" + key;
            const record = await Relatorios.findOne({ where: {uri, id_usuario:req.id_usuario, ativo:true} });
            if (!record) return res.sendStatus(404);
            const storage = new ObjectStorage("RELATORIOS");
            const body = await storage.download_object(storage.bucket,key);
            if (!body) return res.sendStatus(404);
            res.type("application/pdf").set("Cache-Control","private, no-store");
            await pipeline(body as any,res);
        } catch {
            if (!res.headersSent) return res.sendStatus(503);
            res.destroy();
        }
    }
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
            if (String(req.body.id_usuario) !== String(req.id_usuario)) return res.sendStatus(403);
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


