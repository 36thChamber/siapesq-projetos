import { Router } from 'express';
import CamposArteDePescaHttpService from '../services/http/campos-arte-de-pesca-http-service';
import checa_token from '../middlewares/checa-token';
import checa_admin from '../middlewares/checa-admin';

const router = Router();
const httpService = new CamposArteDePescaHttpService();
const checaToken = checa_token as any;
const checaAdmin = checa_admin as any;

router.get('/', checaToken, (req, res, next) => httpService.list(req, res, next));
router.get('/campos/:id_arte_pesca', checaToken, (req, res, next) => httpService.listByArtePescaId(req, res, next));
router.get('/:id', checaToken, (req, res, next) => httpService.get(req, res, next));
router.post('/', checaToken, checaAdmin, (req, res, next) => httpService.create(req, res, next));
router.put('/:id', checaToken, checaAdmin, (req, res, next) => httpService.update(req, res, next));
router.delete('/:id', checaToken, checaAdmin, (req, res, next) => httpService.delete(req, res, next));

export default router;