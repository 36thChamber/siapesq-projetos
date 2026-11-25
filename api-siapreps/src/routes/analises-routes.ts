import { Router } from 'express';
import checa_token from '../middlewares/checa-token';
import AnalisesHttpService from '../services/http/analises-http-service';

const router = Router();
const httpService = new AnalisesHttpService();

router.get("/", checa_token, (req: any, res, next) => httpService.list(req, res, next));
router.get("/download", checa_token, (req: any, res, next) => httpService.get(req, res, next));
router.get("/nomes", checa_token, (req: any, res, next) => httpService.listAnalises(req, res, next));
export default router;