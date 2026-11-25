import { Request, Response } from "express";
import http_status from "../consts/http-status-enum";
import services from "../services/contatos-services";

export default class ContatosController {
    async create(req: Request, res: Response) {
        try {
            const contato = await services.create(req.body);
            return res.status(http_status.OK).json({
                success: true,
                message: "Mensagem enviada com sucesso.",
                data: contato
            });
        } catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR;
            return res.status(statusCode).json({
                success: false,
                message: err.message || "Erro interno do servidor."
            });
        }
    }
}