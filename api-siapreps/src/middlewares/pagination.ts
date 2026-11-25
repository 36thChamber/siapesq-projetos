import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import httpStatus from '../consts/http-status-enum';

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
}).unknown(false);

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function paginationMiddleware(req: Request, res: Response, next: NextFunction) {
  const { error, value } = paginationSchema.validate({
    limit: req.query.limit,
    offset: req.query.offset,
  });
  if (error) {
    return res.status(httpStatus.BAD_REQUEST).json({
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Parâmetros de paginação inválidos',
        details: error.details.map(d => d.message),
        traceId: (req.headers['x-trace-id'] as string) || 'unknown',
      },
    });
  }
  (req as any).pagination = value as PaginationParams;
  next();
}
