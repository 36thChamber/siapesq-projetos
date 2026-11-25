import { Router } from "express";
import RelatoriosHttpService from "../services/http/relatorios-http-service";
import checa_token from "../middlewares/checa-token";

const router = Router({ mergeParams: true });
const httpService = new RelatoriosHttpService();
const checaToken = checa_token as any;

router.get("/", checaToken, (req, res, next) => httpService.listByEmbarcacao(req, res, next));

export default router;