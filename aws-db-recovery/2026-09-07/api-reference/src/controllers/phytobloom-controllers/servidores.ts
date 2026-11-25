import { Response } from 'express';
import { RequestAutenticado } from '../../types/express-types';
import http_status from '../../consts/http-status-enum'
import CriarServidorUseCase from '../../use-cases/phytonbloom_use-cases/servidores/criar-servidor';
import GetServidorUseCase from '../../use-cases/phytonbloom_use-cases/servidores/list-servidor';
import ListaServidoresUseCase from '../../use-cases/phytonbloom_use-cases/servidores/get-servidor';

export default class ServidoresController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetServidorUseCase.valida({ id: parseInt(id) })
            const servidor = await GetServidorUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(servidor)
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
            await ListaServidoresUseCase.valida(query)
            const lista = await ListaServidoresUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarServidorUseCase.valida(req.body)
            const servidor = await CriarServidorUseCase.executa(req.body)
            return res.status(http_status.OK).json(servidor)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}