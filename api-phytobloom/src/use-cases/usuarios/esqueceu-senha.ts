import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices, { PayloadTokenEmail } from "../../services/auth-services";
import EmailService from "../../services/email-service";

/**
 * Mensagem identica para e-mail existente e inexistente.
 * Evita que o cliente descubra se um e-mail esta ou nao cadastrado (PHYTO-SEC-012).
 */
const RESPOSTA_GENERICA = {
  message:
    "Se o e-mail estiver cadastrado, voce receberá instrucoes para redefinir a senha",
};

export default class EsqueceuSenhaUseCase {
  static async executa(email: string): Promise<{ message: string }> {
    if (!email) {
      throw { message: "E-mail e obrigatorio", status: http_status.BAD_REQUEST };
    }

    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw { message: "JWT_SECRET nao configurado", status: http_status.INTERNAL_ERROR };
    }

    const usuario = await Usuarios.findOne({ where: { email } });

    // Se nao encontrado, retorna a MESMA mensagem generica - PHYTO-SEC-012.
    // O contrato HTTP nao revela se a conta existe.
    if (!usuario) {
      return RESPOSTA_GENERICA;
    }

    // Incrementa reset_token_version atomicamente, invalidando tokens anteriores.
    await Usuarios.increment("reset_token_version", { where: { id: usuario.id } });
    await usuario.reload();

    const payload: PayloadTokenEmail = {
      id: Number(usuario.id),
      purpose: "password-reset",
      version: usuario.reset_token_version,
    };

    const token = AuthServices.gera_jwt_token_email(payload, segredo, "1h");

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const link = `${frontendUrl}/redefinir-senha?token=${token}`;

    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "templates",
      "redefinir-senha.hbs",
    );
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);
    const html = template({ nome: usuario.nome, link });

    // Envio SINCRONO mas com resposta generica preservada.
    // Por que nao propagar erro aqui: o contrato anti-enumeracao (PHYTO-SEC-012)
    // exige resposta identica independente do e-mail existir ou nao.
    // Se propagassemos erro de envio, um atacante poderia distinguir
    // "e-mail existe + envio falhou" de "e-mail nao existe".
    //
    // Mas ainda assim aguardamos o envio (await) para:
    // - registrar o log durante o request, nao depois
    // - manter o rate-limiter contando corretamente
    // - evitar promises penduradas se o container for reciclado
    try {
      await EmailService.enviarEmail(
        usuario.email,
        "Redefinicao de senha - PhytoBloom",
        html,
      );
    } catch (err: any) {
      console.error("[email] Falha ao enviar redefinicao:", {
        usuarioId: usuario.id,
        to: usuario.email,
        code: err?.code,
        responseCode: err?.responseCode,
        message: err?.message,
      });
      // proposital: NAO propaga. Mantem RESPOSTA_GENERICA abaixo.
    }

    return RESPOSTA_GENERICA;
  }
}