import { Request } from 'express';
import { PaginationParams } from '../middlewares/pagination';
import { Transaction } from 'sequelize';


export interface AuthContext {
  id_usuario: number;
  administracao: boolean;
  session_id?: string;
}

export interface RequestAutenticado extends Request {

  auth?: AuthContext;
  id_usuario?: number;
  administracao?: boolean;
  session_id?: string;
  transaction?: Transaction;
}

declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}
