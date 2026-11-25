import { Response } from 'express';
import { RequestAutenticado } from '../../types/express-types';
import http_status from '../../consts/http-status-enum'
import CriarReservatorioUseCase from '../../use-cases/phytonbloom_use-cases/reservatorios/criar-reservatorio';
import GetReservatorioUseCase from '../../use-cases/phytonbloom_use-cases/reservatorios/get-reservatorio';
import UpdateReservatorioUseCase from '../../use-cases/phytonbloom_use-cases/reservatorios/update-reservatorio';
import ListaReservatorioUseCase from '../../use-cases/phytonbloom_use-cases/reservatorios/list-reservatorio';
import DeletarReservatorioUseCase from '../../use-cases/phytonbloom_use-cases/reservatorios/delete-reservatorio';

export default class ReservatorioController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetReservatorioUseCase.valida({ id: parseInt(id) })
            const reservatorio = await GetReservatorioUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(reservatorio)
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
            await ListaReservatorioUseCase.valida(query)
            const lista = await ListaReservatorioUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarReservatorioUseCase.valida(req.body)
            const reservatorio = await CriarReservatorioUseCase.executa(req.body)
            return res.status(http_status.OK).json(reservatorio)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async update(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await UpdateReservatorioUseCase.valida(req.body)
            const update = await UpdateReservatorioUseCase.executa(req.body, parseInt(id))
            return res.status(http_status.OK).json(update)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async delete(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await DeletarReservatorioUseCase.valida({ id: parseInt(id) })
            const reservatorio = DeletarReservatorioUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(reservatorio)

        } catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}