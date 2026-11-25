import nodemailer from "nodemailer";

/**
 * Servico centralizado de envio de e-mail via nodemailer
 * Utiliza as variaveis de ambiente EMAIL e SENHA_EMAIL para autenticacao
 * no Gmail SMTP com STARTTLS (porta 587)
 */
export default class EmailService {
  private static createTransporter() {
    const user = process.env.EMAIL;
    const pass = process.env.SENHA_EMAIL;

    if (!user || !pass) {
      throw {
        message: "Variaveis de ambiente EMAIL e SENHA_EMAIL nao configuradas",
        status: 500,
      };
    }

    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      auth: { user, pass },
    });
  }

  /**
   * Envia um email HTML
   * Lanca excecao se as credenciais nao estiverem configuradas
   * Erros de SMTP sao propagados - quem chama decide como tratar
   * (ex: capturar e logar sem expor ao cliente)
   */
  static async enviarEmail(
    para: string,
    assunto: string,
    html: string,
  ): Promise<void> {
    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: `"PhytoBloom" <${process.env.EMAIL}>`,
      to: para,
      subject: assunto,
      html,
    });
  }
}
