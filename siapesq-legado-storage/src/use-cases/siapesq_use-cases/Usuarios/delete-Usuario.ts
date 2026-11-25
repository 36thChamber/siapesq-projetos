
import http_status from '../../../consts/http-status-enum';
import Joi from 'joi';
import usuarios from '../../../models/siapesq/Usuarios';
import { DeleteUsuarioBody } from '../../../types/siapesq_types/Usuarios-types';

export default class DeletarUsuarioUseCase {
    static async valida(body: DeleteUsuarioBody) {
        const schema = Joi.object({
            email: Joi.string().email().required().error(() => new Error('Email inválido')),
        });
        try {
            await schema.validateAsync(body);
        } catch (err: any) {
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    
    static async executa(body: DeleteUsuarioBody) {
        try {
            const usuario = await usuarios.findOne({
                where: { id_usuario: body.id_usuario },
            });

            if (!usuario) {
                throw { message: 'Usuário com este email não encontrado.', status: http_status.NOT_FOUND };
            }

            await usuario.destroy();
        } catch (err: any) {
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
}
