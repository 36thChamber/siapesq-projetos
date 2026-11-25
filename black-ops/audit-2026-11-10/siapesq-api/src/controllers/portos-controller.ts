import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarPortoUseCase from '../use-cases/portos/criar-porto';
import GetPortoUseCase from '../use-cases/portos/get-porto';
import ListaPortosUseCase from '../use-cases/portos/listar-portos';
export default class PortosController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetPortoUseCase.valida({ id: parseInt(id) })
            const porto = await GetPortoUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(porto)
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
            await ListaPortosUseCase.valida(query)
            const lista = await ListaPortosUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarPortoUseCase.valida(req.body)
            const porto = await CriarPortoUseCase.executa(req.body)
            return res.status(http_status.OK).json(porto)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


