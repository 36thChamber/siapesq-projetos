import { Router } from 'express';
import ArtigosController from '../controllers/artigos-controller';
import asyncHandler from '../middlewares/async-handler';
import checa_token from '../middlewares/checa-token';
import checa_admin from '../middlewares/checa-admin';

const router = Router();
const controller = new ArtigosController();

// ROTAS FIXAS E ESPECÍFICAS
router.post("/", checa_token, checa_admin, asyncHandler((req: any, res) => controller.create(req, res)));

// ROTAS COM MIDDLEWARE
router.get("/", checa_token, asyncHandler((req: any, res) => controller.list(req, res)));
router.put("/", checa_token, checa_admin, asyncHandler((req: any, res) => controller.update(req, res)));
router.put("/:id_artigo", checa_token, checa_admin, asyncHandler((req: any, res) => controller.update(req, res)));

// ROTAS COM PARÂMETROS (/:id DEVE VIR POR ÚLTIMO)
router.get("/:id_artigo", checa_token, asyncHandler((req: any, res) => controller.getId(req, res)));

export default router;
