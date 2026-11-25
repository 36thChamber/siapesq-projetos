import { Response } from 'express';
import { RequestAutenticado } from '../../types/express-types';
import http_status from '../../consts/http-status-enum'
//import CriarAlertaUseCase from '../../use-cases/phytonbloom_use-cases/alertas/criar-alerta';
//import ListaAlertaUseCase from '../../use-cases/phytonbloom_use-cases/alertas/list-alerta';
import GetAreas_AlertaUseCase from '../../use-cases/phytonbloom_use-cases/areas_alertas/get-areas-alertas';
import ListarAreas_AlertasUseCase from '../../use-cases/phytonbloom_use-cases/areas_alertas/listar-areas-alertas';
import CriarAreas_AlertaUseCase from '../../use-cases/phytonbloom_use-cases/areas_alertas/criar-area-alerta';

export default class Areas_AlertasController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id_reservatorio } = req.params
            await GetAreas_AlertaUseCase.valida({ id_reservatorio: parseInt(id_reservatorio) })
            const alerta = await GetAreas_AlertaUseCase.executa({ id_reservatorio: parseInt(id_reservatorio) })
            return res.status(http_status.OK).json(alerta)
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
            await ListarAreas_AlertasUseCase.valida(query)
            const lista = await ListarAreas_AlertasUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarAreas_AlertaUseCase.valida(req.body)
            const alerta = await CriarAreas_AlertaUseCase.executa(req.body)
            return res.status(http_status.OK).json(alerta)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

}