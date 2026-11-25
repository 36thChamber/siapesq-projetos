import httpStatus from "../consts/http-status-enum";
import { TipoUsuario } from "../models/enums/tipoUsuarioEnum";


export type AtorAutenticado = {
  id_usuario?: string;
  tipo_usuario?: string;
};

export function atorDaRequisicao(req: {
  id_usuario?: string;
  tipo_usuario?: string;
}): AtorAutenticado {
  return { id_usuario: req.id_usuario, tipo_usuario: req.tipo_usuario };
}

function exigeAutenticado(ator: AtorAutenticado | undefined): AtorAutenticado {

  if (!ator || !ator.id_usuario) {
    throw {
      message: "Usuário não autenticado.",
      status: httpStatus.UNAUTHORIZED,
    };
  }
  return ator;
}

export function ehAdmin(ator: AtorAutenticado | undefined): boolean {
  return ator?.tipo_usuario === TipoUsuario.ADMIN;
}


export function exigeAdmin(ator: AtorAutenticado | undefined): void {
  const autenticado = exigeAutenticado(ator);

  if (!ehAdmin(autenticado)) {
    throw {
      message: "Apenas administradores podem realizar esta ação.",
      status: httpStatus.FORBIDDEN,
    };
  }
}


export function exigeDonoOuAdmin(
  ator: AtorAutenticado | undefined,
  id_dono: string | null | undefined,
): void {
  const autenticado = exigeAutenticado(ator);

  if (ehAdmin(autenticado)) return;

  if (!id_dono || autenticado.id_usuario !== id_dono) {
    throw {
      message: "Você não tem permissão para acessar este recurso.",
      status: httpStatus.FORBIDDEN,
    };
  }
}
