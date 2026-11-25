import http_status from '../../consts/http-status-enum';
import Joi from 'joi';
import UsuariosAtivos from '../../models/UsuariosAtivos';
import {  DeleteUsuarioAtivoBody, DeleteUsuarioAtivoResponse } from '../../types/usuariosAtivos-types';

export default class DeletarUsuarioAtivoUseCase {
    static async valida(body:DeleteUsuarioAtivoBody) {
        const schema = Joi.object({
            email: Joi.string().required().error(() => new Error('email inválido')),
        });

        try {
            await schema.validateAsync(body);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    static async executa(body:DeleteUsuarioAtivoBody) {
        try {
            const usuarioAtivo = await UsuariosAtivos.findOne(
                { where: { email: body.email } }
            );
            if (!usuarioAtivo) {
                throw { message: 'usuario ativo neste email não encontrado.', status: http_status.NOT_FOUND };
            }
            await usuarioAtivo.destroy();
        } catch (err: any) {
            throw { message: err.message, status: http_status.INTERNAL_ERROR };
        }
    }
}
