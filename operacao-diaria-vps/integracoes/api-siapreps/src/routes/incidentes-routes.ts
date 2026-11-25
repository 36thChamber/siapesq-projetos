import { Router } from 'express';
import IncidentesHttpService from '../services/http/incidentes-http-service';
import checa_token from '../middlewares/checa-token';

const router = Router();
const httpService = new IncidentesHttpService();
const checaToken = checa_token as any;

router.patch('/:id', checaToken, (req: any, res, next) => httpService.atualizar(req, res, next));

export default router;
