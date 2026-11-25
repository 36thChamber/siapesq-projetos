import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

interface ContatoBody {
    nome: string;
    email: string;
    telefone?: string;
    empresa_ou_instituicao: string;
    cargo?: string;
    mensagem: string;
}

const contato_schema = Joi.object<ContatoBody>({
    nome: Joi.string().required().error(new Error("O nome é obrigatório.")),
    email: Joi.string().email().required().error(new Error("E-mail inválido.")),
    telefone: Joi.string().allow('', null),
    empresa_ou_instituicao: Joi.string().required().error(new Error("Empresa ou instituição é obrigatória.")),
    cargo: Joi.string().allow('', null),
    mensagem: Joi.string().required().error(new Error("A mensagem não pode estar vazia.")),
});

class CriarContatoUseCase {
    public static async valida(body: ContatoBody): Promise<void> {
        try {
            await contato_schema.validateAsync(body);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    public static async executa(body: ContatoBody) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.SENHA_EMAIL
            }
        });

const templatePath = path.join(process.cwd(), 'src', 'templates', 'contato_comercial.html');
        
        try {
    
            const lendo_template = fs.readFileSync(templatePath, 'utf-8');
            const template_aberto = handlebars.compile(lendo_template);
            
            
            const template_pronto = template_aberto({
                email: body.email,
                nome: body.nome,
                empresa: body.empresa_ou_instituicao,
                telefone: body.telefone || 'Não informado',
                cargo: body.cargo || 'Não informado',
                mensagem: body.mensagem,
                plataforma: 'SIAPESQ - Contato'
            });

           
            const mailOptions = {
                from: process.env.EMAIL,      
                replyTo: body.email,          
                to: process.env.EMAIL,      
                subject: `Mensagem de contato: ${body.nome}`,
                html: template_pronto
            };

            
            const info = await transporter.sendMail(mailOptions);
            console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=E-mail enviado: ', info.response);

            return { 
                success: true, 
                message: "Mensagem enviada com sucesso!" 
            };

        } catch (error: any) {
            console.error('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Erro ao enviar o e-mail:', error);
            throw { 
                message: "Erro ao processar o envio da mensagem.", 
                status: http_status.INTERNAL_ERROR 
            };
        }
    }
}

export default CriarContatoUseCase;