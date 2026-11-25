import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarMotorUseCase from '../use-cases/motores/criar-motor';
import GetMotorUseCase from '../use-cases/motores/get-motor';
import ListarMotoresUseCase from '../use-cases/motores/listar-motores';
export default class MotoresController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetMotorUseCase.valida({ id: parseInt(id) })
            const motor = await GetMotorUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(motor)
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
            await ListarMotoresUseCase.valida(query)
            const lista = await ListarMotoresUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarMotorUseCase.valida(req.body)
            const motor = await CriarMotorUseCase.executa(req.body)
            return res.status(http_status.OK).json(motor)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


