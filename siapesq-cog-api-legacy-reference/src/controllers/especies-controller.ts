import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarEspecieUseCase from '../use-cases/especies/criar-especie';
import GetEspecieUseCase from '../use-cases/especies/get-especie';
import ListaEspeciesUseCase from '../use-cases/especies/listar-especies';
export default class EspeciesController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetEspecieUseCase.valida({ id: parseInt(id) })
            const especie = await GetEspecieUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(especie)
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
            await ListaEspeciesUseCase.valida(query)
            const lista = await ListaEspeciesUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarEspecieUseCase.valida(req.body)
            const especie = await CriarEspecieUseCase.executa(req.body)
            return res.status(http_status.OK).json(especie)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


