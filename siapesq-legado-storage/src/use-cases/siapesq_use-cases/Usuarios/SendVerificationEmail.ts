import EmailService from "../../../services/verificarEmail-services";
import AuthServices from "../../../services/auth-services";
import http_status from "../../../consts/http-status-enum";


export default class SendVerificationEmail {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    /**
     * Gera o token de verificação e envia o email.
     * @param userId
     * @param userEmail
     * @param userName
     */
    public async execute(userId: number, userEmail: string, userName: string): Promise<void> {
        
        const segredo = process.env.JWT_SECRET;
        if (!segredo) {
            throw {
                message: "JWT_SECRET não setado",
                status: http_status.INTERNAL_ERROR,
            };
        }
        const verificationToken = AuthServices.gera_jwt_token_email(
            { id: userId, type: 'email_verification' },
            segredo
        );
        await this.emailService.sendVerificationEmail(
            userName, 
            userEmail, 
            verificationToken
        );
    }
}