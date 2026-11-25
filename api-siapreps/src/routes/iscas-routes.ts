import { Router } from "express";
import IscasHttpService from "../services/http/iscas-http-service";
import checaToken from "../middlewares/checa-token";
import checa_admin from "../middlewares/checa-admin";

const router = Router();
const httpService = new IscasHttpService();
const checaAdmin = checa_admin as any;

router.get("/", checaToken, (req: any, res, next) => httpService.list(req, res, next));
router.get("/:id", checaToken, (req: any, res, next) => httpService.get(req, res, next));
router.post("/", checaToken, checaAdmin, (req: any, res, next) => httpService.create(req, res, next));
router.put("/:id", checaToken, checaAdmin, (req: any, res, next) => httpService.update(req, res, next));
router.delete("/:id", checaToken, checaAdmin, (req: any, res, next) => httpService.delete(req, res, next));
router.put("/:id/ativar", checaToken, checaAdmin, (req: any, res, next) => httpService.ativar(req, res, next));
router.put("/:id/desativar", checaToken, checaAdmin, (req: any, res, next) => httpService.desativar(req, res, next));

export default router;