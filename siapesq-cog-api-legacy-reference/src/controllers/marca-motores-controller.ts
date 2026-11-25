import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarMarcaMotorUseCase from '../use-cases/marca-motores/criar-marca-motor';
import GetMarcaMotorUseCase from '../use-cases/marca-motores/get-marca-motor';
import ListaMarcaMotoresUseCase from '../use-cases/marca-motores/listar-marca-motor';
export default class MarcaMotoresController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetMarcaMotorUseCase.valida({ id: parseInt(id) })
            const marca_motor = await GetMarcaMotorUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(marca_motor)
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
            await ListaMarcaMotoresUseCase.valida(query)
            const lista = await ListaMarcaMotoresUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarMarcaMotorUseCase.valida(req.body)
            const marca_motor = await CriarMarcaMotorUseCase.executa(req.body)
            return res.status(http_status.OK).json(marca_motor)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}


