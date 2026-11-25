import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarLanceUseCase from '../use-cases/lances/criar-lance';
import GetLanceUseCase from '../use-cases/lances/get-lance';
import ListaLancesUseCase from '../use-cases/lances/listar-lances';
export default class LancesController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetLanceUseCase.valida({ id: parseInt(id) })
            const Lance = await GetLanceUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(Lance)
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
            await ListaLancesUseCase.valida(query)
            const lista = await ListaLancesUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarLanceUseCase.valida(req.body)
            const Lance = await CriarLanceUseCase.executa(req.body)
            return res.status(http_status.OK).json(Lance)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


