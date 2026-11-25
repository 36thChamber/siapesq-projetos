import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";
import EnviarVerificacaoEmailUseCase from "./verificar-email";

import { TipoUsuario } from "../../models/enums/tipoUsuarioEnum";
import { StatusUsuario } from "../../models/enums/statususuarioEnum";
import ScientificCertificates, { validateCertificate, certificatesEnabled } from "../../services/scientific-certificates";

import {
  CriarUsuarioBodyRequest,
  CriarUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

export default class CriarUsuarioUseCase {
  static async valida(body: CriarUsuarioBodyRequest): Promise<void> {
    const schema = Joi.object({
      nome: Joi.string().required(),
      email: Joi.string().email().required(),
      senha: Joi.string().required(),
      contato: Joi.string().optional().allow(null, ""),
      cpf: Joi.string().required(),
      titulo_cientifico: Joi.boolean().optional(),
      comprovante: Joi.object().optional(),
      curriculo_lattes: Joi.string().optional().allow(null, ""),

      tipo_usuario: Joi.any().strip(),
      email_verificado: Joi.any().strip(),
      status: Joi.any().strip(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: CriarUsuarioBodyRequest,
  ): Promise<CriarUsuarioResponse> {
    await this.valida(body);
    const certificate = body.comprovante ? validateCertificate(body.comprovante) : undefined;
    if (certificate && !certificatesEnabled()) throw {status:503,message:"Envio de comprovantes indisponível neste ambiente."};
    if (certificate && body.titulo_cientifico !== true) throw {status:400,message:"Informe a solicitação de título científico para enviar o comprovante."};

    const usuarioEmail = await Usuarios.findOne({
      where: {
        email: body.email,
      },
    });

    if (usuarioEmail) {
      throw {
        message: `Usuário ${body.email} já foi cadastrado`,
        status: httpStatus.CONFLICT,
      };
    }

    const usuarioCpf = await Usuarios.findOne({
      where: {
        cpf: body.cpf,
      },
    });

    if (usuarioCpf) {
      throw {
        message: `CPF ${body.cpf} já foi cadastrado`,
        status: httpStatus.CONFLICT,
      };
    }

    const data = {
      nome: body.nome,
      email: body.email,
      senha: await AuthServices.hash_senha(body.senha),
      contato: body.contato ?? "",
      cpf: body.cpf,
      titulo_cientifico: body.titulo_cientifico ?? false,
      curriculo_lattes: body.curriculo_lattes ?? null,
      tipo_usuario: TipoUsuario.PADRAO,
      email_verificado: false,
      status: StatusUsuario.PENDENTE,
    };
    const usuario = certificate ? await Usuarios.sequelize!.transaction(async transaction => {
      const created = await Usuarios.create(data,{transaction});
      await ScientificCertificates.save(created.id_usuario,certificate,transaction);
      return created;
    }) : await Usuarios.create(data);

    let emailVerificacaoEnviado = false;
    try {
      await EnviarVerificacaoEmailUseCase.executa({
        id_usuario: usuario.id_usuario,
      });
      emailVerificacaoEnviado = true;
    } catch {
      emailVerificacaoEnviado = false;
    }

    return {
      ...toUsuarioResponse(usuario),
      email_verificacao_enviado: emailVerificacaoEnviado,
    };
  }
}
