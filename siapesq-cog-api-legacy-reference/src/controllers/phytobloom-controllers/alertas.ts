import { Response } from 'express';
import { RequestAutenticado } from '../../types/express-types';
import http_status from '../../consts/http-status-enum'
import CriarAlertaUseCase from '../../use-cases/phytonbloom_use-cases/alertas/criar-alerta';
import GetAlertaUseCase from '../../use-cases/phytonbloom_use-cases/alertas/get-alerta';
import ListaAlertaUseCase from '../../use-cases/phytonbloom_use-cases/alertas/list-alerta';

export default class AlertasController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetAlertaUseCase.valida({ id: parseInt(id) })
            const alerta = await GetAlertaUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(alerta)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async list(req: RequestAutenticado, res: Response) {
        try {
            let { limit, offset, data_inicio, data_fim } = req.query
            if (limit && typeof limit !== 'string') {
                throw { status: http_status.BAD_REQUEST, message: 'Parâmetros inválidos: limit e offset devem ser números' }
            }
            if (offset && typeof offset !== 'string') {
                throw { status: http_status.BAD_REQUEST, message: 'Parâmetros inválidos: limit e offset devem ser números' }
            }
            const query = {
                limit: limit ? parseInt(limit) : 10000,
                offset: offset ? parseInt(offset) : 0,
                data_inicio: data_inicio,
                data_fim: data_fim
            }
            await ListaAlertaUseCase.valida(query)
            const lista = await ListaAlertaUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarAlertaUseCase.valida(req.body)
            const alerta = await CriarAlertaUseCase.executa(req.body)
            return res.status(http_status.OK).json(alerta)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async createBulk(req: RequestAutenticado, res: Response) {
        try {
            const alertas = await CriarAlertaUseCase.validaBuik(req.body)
            await CriarAlertaUseCase.executaBulk({ alertas })
            return res.status(http_status.OK).json("ok")
        }
        catch (err: any) {
            console.log(err)
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}