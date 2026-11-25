import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import GetEspeciesAnalisesUseCase from "../use-cases/especies_analises/get-especies_analises";
import ListaEspeciesAnalisesUseCase from "../use-cases/especies_analises/listar-especies_analises";

export default class Especies_analisesController {
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
            await ListaEspeciesAnalisesUseCase.valida(query)
            const lista = await ListaEspeciesAnalisesUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetEspeciesAnalisesUseCase.valida({ id: parseInt(id) })
            const especie = await GetEspeciesAnalisesUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(especie)
        } catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}