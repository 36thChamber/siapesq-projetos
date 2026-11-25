import AuthServices from '../../../services/auth-services';
import usuarios from '../../../models/siapesq/Usuarios';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import http_status from '../../../consts/http-status-enum';

export default class ConfirmUserEmail {

    static valida(body: { token: string }) {
        if (!body.token) {
            throw {
                status: http_status.BAD_REQUEST,
                message: "Token de verificação não fornecido.",
            };
        }
    }

    static async executa(token: string) {
        const segredo = process.env.JWT_SECRET;
        if (!segredo) {
            throw {
                message: "Erro de configuração: JWT_SECRET não está definido.",
                status: http_status.INTERNAL_ERROR,
            };
        }
        try {
            const payload = AuthServices.decoda_jwt_token(token, segredo);
            const userId = payload.id;
            const [rowsAffected] = await usuarios.update(
                { email_verificado: true },
                { 
                    where: { id_usuario: userId },
                    limit: 1
                }
            );
            if (rowsAffected === 0) {
                throw {
                    status: http_status.NOT_FOUND,
                    message: "Usuário não encontrado ou já verificado.",
                };
            }
        } catch (err: any) {
            if (err instanceof TokenExpiredError) {
                throw {
                    status: http_status.UNAUTHORIZED,
                    message: "O link de verificação expirou. Por favor, solicite o reenvio.",
                };
            }
            if (err instanceof JsonWebTokenError) {
                throw {
                    status: http_status.UNAUTHORIZED,
                    message: "Token de verificação inválido ou malformado.",
                };
            }
            throw err;
        }
    }
}