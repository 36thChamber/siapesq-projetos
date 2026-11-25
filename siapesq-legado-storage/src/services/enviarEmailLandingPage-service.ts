// emailService.ts

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';


// Configurações do transportador de e-mail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL, // substitua pelo seu e-mail
    pass: process.env.SENHA_EMAIL // substitua pela sua senha
  }
});

export async function enviandoEmail(email: string,nome: string, sobrenome: string, mensagem: string, plataforma: string) {  const template = path.join('src', 'templates', 'enviar_email.html')
  const lendo_template = fs.readFileSync(template, 'utf-8')
  const template_aberto = handlebars.compile(lendo_template)
  const template_pronto = template_aberto({email,nome, sobrenome, mensagem, plataforma})
  const mailOptions = {
    from: process.env.EMAIL,
    replyTo: email,
    to: process.env.EMAIL,
    subject: 'Mensagem de contato',
    html: template_pronto
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=E-mail enviado: ', info.response);
    return info
  } catch (error) {
    console.error('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Erro ao enviar o e-mail:', error);
    throw new Error('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Erro ao enviar o e-mail.');
  }
}
