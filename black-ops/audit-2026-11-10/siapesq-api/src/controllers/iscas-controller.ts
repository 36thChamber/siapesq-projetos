import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarIscaUseCase from '../use-cases/iscas/criar-isca';
import GetIscaUseCase from '../use-cases/iscas/get-isca';
import ListaIscasUseCase from '../use-cases/iscas/listar-iscas';
export default class IscasController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetIscaUseCase.valida({ id: parseInt(id) })
            const isca = await GetIscaUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(isca)
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
            await ListaIscasUseCase.valida(query)
            const lista = await ListaIscasUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarIscaUseCase.valida(req.body)
            const isca = await CriarIscaUseCase.executa(req.body)
            return res.status(http_status.OK).json(isca)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


