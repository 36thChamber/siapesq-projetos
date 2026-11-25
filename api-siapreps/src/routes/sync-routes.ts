import { Router } from "express";
import checa_token from "../middlewares/checa-token";
import SyncHttpService from "../services/http/sync-http-service";

const router = Router();
const httpService = new SyncHttpService();
const checaToken = checa_token as any;

router.get("/reconciliation/:entity/:client_record_id", checaToken, (req: any, res, next) =>
  httpService.reconciliar(req, res, next),
);

export default router;
