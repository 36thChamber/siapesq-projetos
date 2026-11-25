
import { Request, Response } from 'express';
import { RequestAutenticado } from '../../types/express-types';
import http_status from '../../consts/http-status-enum';
import services from '../../services/usuarios_phyto-services'
import AuthServices from '../../services/auth-services';
import ListandoUsuarios from '../../use-cases/phytonbloom_use-cases/usuarios/list-usuarios';

export default class UsuariosController {
    async login(req: Request, res: Response) {
        try {
            const { email, senha } = req.body
            const usuario = await services.login({ email, senha })
            return res.status(http_status.OK).json(usuario)
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
            await ListandoUsuarios.valida(query)
            const lista = await ListandoUsuarios.executa(query)
            return res.status(http_status.OK).json(lista)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async getId(req: RequestAutenticado, res: Response) {
        try {
            const id = parseInt(req.params.id)
            const usuario = await services.get(id)
            return res.status(http_status.OK).json(usuario)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { nome, email, senha, documento, telefone, ativo, user_verify } = req.body
            const usuario = await services.create({ nome, email, senha, documento, telefone, ativo, user_verify })

            return res.status(http_status.OK).json(usuario)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async update(req: RequestAutenticado, res: Response) {
        try {
            const usuario = await services.update(req.body, Number(req.params.id))
            return res.status(http_status.OK).json(usuario)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async novoToken(req: RequestAutenticado, res: Response) {
        try {
            const usuario = await services.get(req.id_usuario)
            const id = usuario.id
            const segredo = process.env.JWT_SECRET
            if (!segredo) {
                throw ({
                    message: "JWT_SECRET nao setado",
                    status: http_status.INTERNAL_ERROR
                })
            }
            const novoToken = AuthServices.gera_jwt_token({ id }, segredo)

            return res.status(http_status.OK).json({
                id: id,
                nome: usuario.nome,
                email: usuario.email,
                ativo: usuario.ativo,
                user_verify: usuario.user_verify,
                documento: usuario.documento,
                telefone: usuario.telefone,
                token: novoToken,
            })
        } catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }

    async delete(req: RequestAutenticado, res: Response) {
        try {
            const usuario = await services.delete(req.body)
            return res.status(http_status.OK).json(usuario)
        }
        catch (err: any) {
            const statusCode = err.status || http_status.INTERNAL_ERROR
            return res.status(statusCode).json(err)
        }
    }
}