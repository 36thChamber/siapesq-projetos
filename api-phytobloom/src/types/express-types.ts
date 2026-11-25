import { Request } from "express";

export interface RequestAutenticado extends Request {
  id_usuario: number | string;
  is_admin: boolean;
  ativo: boolean;
  user_verify: boolean;
  autenticado_por_api_key?: boolean;
}
