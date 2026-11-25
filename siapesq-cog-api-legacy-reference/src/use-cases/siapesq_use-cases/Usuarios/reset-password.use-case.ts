import Joi from 'joi';
import http_status from '../../../consts/http-status-enum';
import Usuarios from '../../../models/siapesq/Usuarios'; 
import EmailService from '../../../services/verificarEmail-services';
import AuthService from '../../../services/auth-services';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';


interface ResetPasswordBody {
    token: string;
    novaSenha: string;
}

const reset_password_schema = Joi.object<ResetPasswordBody>({
    token: Joi.string().required().error(new Error("Token de redefinição ausente ou inválido.")),
    novaSenha: Joi.string().min(6).required().error(new Error("A nova senha deve ter no mínimo 6 caracteres.")),
});

class ResetPasswordUseCase {
    private static emailService: EmailService = new EmailService();
    
    public static async valida(body: ResetPasswordBody): Promise<void> {
        try {
            await reset_password_schema.validateAsync(body);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    public static async executa(body: ResetPasswordBody): Promise<void> {
        const { token, novaSenha } = body;
        let userId: number | string;
        try {
            const segredo = process.env.JWT_SECRET;
            if (!segredo) {
                throw { message: "JWT_SECRET não configurado.", status: http_status.INTERNAL_ERROR };
            }
            const payload = AuthService.decoda_jwt_token(token, segredo);
            userId = payload.id;
        } catch (err) {
            if (err instanceof TokenExpiredError) {
                 throw { message: "O link de redefinição de senha expirou. Por favor, solicite um novo.", status: http_status.UNAUTHORIZED };
            }
            if (err instanceof JsonWebTokenError) {
                 throw { message: "Token de redefinição inválido.", status: http_status.UNAUTHORIZED };
            }
            throw { message: "Erro ao processar o token de redefinição.", status: http_status.INTERNAL_ERROR };
        }
        
        const usuario = await Usuarios.findByPk(userId);
        if (!usuario) {
            throw {
                message: "Usuário não encontrado.",
                status: http_status.NOT_FOUND 
            };
        }

        const novaSenhaHash = await AuthService.hash_senha(novaSenha);

        await usuario.update({
            senha: novaSenhaHash,
        });

        await ResetPasswordUseCase.emailService.sendPasswordChangedConfirmation(usuario.email, usuario.nome);
    }
}

export default ResetPasswordUseCase;