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

export async function alterarSenha(nome: string, email: string, token: string) {
  const verificationUrl = `https://api.example.invalid/v1/phytoBloom/esqueceuSenha/alterarSenha/${token}`
  //const verificationUrl = `https://api.example.invalid/v1/phytoBloom/esqueceuSenha/alterarSenha/${token}`
  const template = path.join('src', 'templates', 'passwordreset_template.html')
  const lendo_template = fs.readFileSync(template, 'utf-8')
  const template_aberto = handlebars.compile(lendo_template)
  const template_pronto = template_aberto({nome: nome, verificationUrl: verificationUrl})

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Alteração de senha - PhytoBloom',
    html:template_pronto
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=E-mail enviado: ', info.response);
  } catch (error) {
    console.error('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Erro ao enviar o e-mail:', error);
    throw new Error('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Erro ao enviar o e-mail.');
  }
}
