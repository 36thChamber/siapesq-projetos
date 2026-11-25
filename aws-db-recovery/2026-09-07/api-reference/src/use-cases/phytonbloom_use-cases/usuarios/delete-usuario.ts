import http_status from '../../../consts/http-status-enum';
import Joi from 'joi';
import Usuarios from '../../../models/phytoBloom/Usuarios';
import {  DeleteUsuarioBody, DeleteUsuarioResponse } from '../../../types/phytobloom-types/usuarios-types';

export default class DeletarUsuarioUseCase {
    static async valida(body:DeleteUsuarioBody) {
        const schema = Joi.object({
            email: Joi.string().required().error(() => new Error('email inválido')),
        });

        try {
            await schema.validateAsync(body);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    static async executa(body:DeleteUsuarioBody) {
        try {
            const usuario = await Usuarios.findOne(
                { where: { email: body.email } }
            );
            if (!usuario) {
                throw { message: 'usuario ativo neste email não encontrado.', status: http_status.NOT_FOUND };
            }
            await usuario.destroy();
        } catch (err: any) {
            throw { message: err.message, status: http_status.INTERNAL_ERROR };
        }
    }
}
