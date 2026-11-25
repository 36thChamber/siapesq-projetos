import nodemailer from "nodemailer";

export default class EmailServices {
  static async enviarRecuperacaoSenha(
    destinatario: string,
    nome: string,
    link: string,
  ): Promise<void> {
    const email = process.env.EMAIL;
    const senha = process.env.SENHA_EMAIL;

    if (!email || !senha) {
      throw new Error("EMAIL e SENHA_EMAIL devem estar configurados");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: email, pass: senha },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || email,
      to: destinatario,
      subject: "Recuperacao de senha - SIAPREPS",
      text: `Ola, ${nome}. Use este link para criar uma nova senha: ${link}. O link expira em 1 hora.`,
      html: `<p>Ola, ${nome}.</p><p>Use o link abaixo para criar uma nova senha:</p><p><a href="${link}">Redefinir minha senha</a></p><p>Este link expira em 1 hora e pode ser usado uma unica vez.</p>`,
    });
  }
}
