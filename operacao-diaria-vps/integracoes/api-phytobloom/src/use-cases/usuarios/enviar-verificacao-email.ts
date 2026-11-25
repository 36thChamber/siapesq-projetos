import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices, { PayloadTokenEmail } from "../../services/auth-services";
import EmailService from "../../services/email-service";

export default class EnviarVerificacaoEmailUseCase {
  static async executa(id_usuario: number | string): Promise<{ message: string }> {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw { message: "JWT_SECRET nao configurado", status: http_status.INTERNAL_ERROR };
    }

    const usuario = await Usuarios.findByPk(id_usuario);
    if (!usuario) {
      throw { message: "Usuario nao encontrado", status: http_status.NOT_FOUND };
    }

    // Idempotente: se ja verificado, retorna sucesso sem reenvio
    if (usuario.user_verify) {
      return { message: "E-mail ja verificado" };
    }

    // Incrementa verify_token_version atomicamente.
    // Isso invalida qualquer token de verificacao anterior emitido para este usuario.
    await Usuarios.increment("verify_token_version", { where: { id: usuario.id } });

    // Recarrega para pegar a versao atualizada
    await usuario.reload();
    const novaVersion = usuario.verify_token_version;

    const payload: PayloadTokenEmail = {
      id: Number(usuario.id),
      purpose: "email-verification",
      version: novaVersion,
    };

    const token = AuthServices.gera_jwt_token_email(payload, segredo, "24h");

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const link = `${frontendUrl}/verificar-email?token=${token}`;

    // Compila o template Handlebars
    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "templates",
      "verificar-email.hbs",
    );
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);
    const html = template({ nome: usuario.nome, link });

    // Envio SINCRONO: aguarda o provedor aceitar antes de responder.
    // Se falhar, propaga erro para o controller retornar ao cliente.
    // Isso impede o "sucesso falso" onde o front mostra 'E-mail Enviado!'
    // mas o e-mail nunca chega.
    try {
      await EmailService.enviarEmail(
        usuario.email,
        "Verifique seu e-mail — PhytoBloom",
        html,
      );
    } catch (err: any) {
      console.error("[email] Falha ao enviar verificacao:", {
        usuarioId: usuario.id,
        to: usuario.email,
        code: err?.code,
        responseCode: err?.responseCode,
        command: err?.command,
        message: err?.message,
      });

      throw {
        message: "Erro ao enviar o e-mail de verificacao",
        status: http_status.INTERNAL_ERROR,
      };
    }

    return { message: "E-mail de verificacao enviado" };
  }
}