import { Response } from 'express';
import { RequestAutenticado } from "../types/express-types";
import GetArtesDePescaUseCase from "../use-cases/artesDePesca/get-artesDePesca";
import http_status from '../consts/http-status-enum';
import ListArtesDePescaUseCase from '../use-cases/artesDePesca/list_artesDePesca';

export default class artesDePescaController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetArtesDePescaUseCase.valida({ id: parseInt(id) })
            const artes = await GetArtesDePescaUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(artes)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async list(req: RequestAutenticado, res: Response) {
        try {
            let { limit, offset } = req.query
            if (limit && typeof limit !== 'string') {
                throw { status: http_status.BAD_REQUEST, message: 'Parâmetros inválidos: limit e offset devem ser números' }

            }
            if (offset && typeof offset !== 'string') {
                throw { status: http_status.BAD_REQUEST, message: 'Parâmetros inválidos: limit e offset devem ser números' }
            }
            const query = {
                limit: limit ? parseInt(limit) : 10000,
                offset: offset ? parseInt(offset) : 0
            }
            await ListArtesDePescaUseCase.valida(query)
            const lista = await ListArtesDePescaUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}