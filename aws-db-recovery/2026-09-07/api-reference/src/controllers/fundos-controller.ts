import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarFundoUseCase from '../use-cases/especies/criar-especie';
import GetFundoUseCase from '../use-cases/fundos/get-fundo';
import ListaFundosUseCase from '../use-cases/fundos/listar-fundos';
export default class FundosController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetFundoUseCase.valida({ id: parseInt(id) })
            const fundo = await GetFundoUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(fundo)
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
            await ListaFundosUseCase.valida(query)
            const lista = await ListaFundosUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarFundoUseCase.valida(req.body)
            const fundo = await CriarFundoUseCase.executa(req.body)
            return res.status(http_status.OK).json(fundo)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


