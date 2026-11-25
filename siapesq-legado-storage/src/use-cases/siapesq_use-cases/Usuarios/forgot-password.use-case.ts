import Joi from 'joi';
import http_status from '../../../consts/http-status-enum';
import Usuarios from '../../../models/siapesq/Usuarios'; 
import EmailService from '../../../services/verificarEmail-services';
import AuthService from '../../../services/auth-services';

const forgot_password_schema = Joi.object({
    email: Joi.string().email().required().error(new Error("Email de recuperação inválido ou não fornecido.")),
});

class ForgotPasswordUseCase {
    private static emailService: EmailService = new EmailService(); 
    
    public static async valida(body: { email: string }): Promise<void> {
        try {
            await forgot_password_schema.validateAsync(body);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    public static async executa(body: { email: string }): Promise<void> {
        const { email } = body;
        try {
            const usuario = await Usuarios.findOne({ where: { email } });

            if (!usuario) {
                console.warn(`Tentativa de recuperação de senha para email não encontrado: ${email}`);
                return;
            }

            const segredo = process.env.JWT_SECRET;
            if (!segredo) {
                throw { message: "JWT_SECRET não configurado.", status: http_status.INTERNAL_ERROR };
            }

            const base = 'https://api.example.invalid/v1/siapesq/usuarios';
            const token = AuthService.gera_jwt_token_email({ id: usuario.id_usuario }, segredo); 
            const resetLink = `${base}/reset-password-form?token=${token}`;
            
            await ForgotPasswordUseCase.emailService.sendPasswordReset(usuario.email, usuario.nome, resetLink);
        } catch (err) {
            throw err;
        }
    }
}

export default ForgotPasswordUseCase;