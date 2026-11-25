import { Response } from 'express';
import { RequestAutenticado } from '../types/express-types';
import http_status from '../consts/http-status-enum'
import CriarEmbarcacaoUseCase from '../use-cases/embarcacoes/criar-embacacao';
import GetEmbarcacaoUseCase from '../use-cases/embarcacoes/get-embarcacao';
import UpdateEmbarcacaoUseCase from '../use-cases/embarcacoes/update-embarcacao';
import ListaEmbarcacaoUseCase from '../use-cases/embarcacoes/listar-embacacao';
export default class EmbarcacaoController {
    async get(req: RequestAutenticado, res: Response) {
        try {
            const { id } = req.params
            await GetEmbarcacaoUseCase.valida({ id: parseInt(id) })
            const embarcacao = await GetEmbarcacaoUseCase.executa({ id: parseInt(id) })
            return res.status(http_status.OK).json(embarcacao)
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
            await ListaEmbarcacaoUseCase.valida(query)
            const lista = await ListaEmbarcacaoUseCase.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async create(req: RequestAutenticado, res: Response) {
        try {
            await CriarEmbarcacaoUseCase.valida(req.body)
            const fundo = await CriarEmbarcacaoUseCase.executa(req.body)
            return res.status(http_status.OK).json(fundo)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
    async update(req: RequestAutenticado, res: Response) {
        try {
            await UpdateEmbarcacaoUseCase.valida(req.body)
            const update = await UpdateEmbarcacaoUseCase.executa(req.body, req.body.id)
            return res.status(http_status.OK).json(update)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}