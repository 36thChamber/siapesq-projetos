import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarArmadilhaUseCase from '../use-cases/armadilhas/criar-armadilhas';
import GetArmadilhaUseCase from '../use-cases/armadilhas/get-armadilha';
import ListaArmadilhasUseCase from '../use-cases/armadilhas/listar-armadilhas';
export default class PortosController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetArmadilhaUseCase.valida({ id: parseInt(id) })
            const armadilha = await GetArmadilhaUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(armadilha)
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
            await ListaArmadilhasUseCase.valida(query)
            const lista = await ListaArmadilhasUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarArmadilhaUseCase.valida(req.body)
            const armadilha = await CriarArmadilhaUseCase.executa(req.body)
            return res.status(http_status.OK).json(armadilha)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


