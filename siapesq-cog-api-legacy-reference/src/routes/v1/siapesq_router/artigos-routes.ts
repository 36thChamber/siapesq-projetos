import { Router } from 'express';
import ArtigosController from '../../../controllers/siapesq_controllers/artigos-controller';
import checa_token from '../../../middlewares/checa-token';

const router = Router();
const controller = new ArtigosController();

// ROTAS FIXAS E ESPECÍFICAS
router.post("/", checa_token, (req: any, res) => controller.create(req, res));

// ROTAS COM MIDDLEWARE
router.get("/", checa_token, (req: any, res) => controller.list(req, res));
router.put("/", checa_token, (req: any, res) => controller.update(req, res));

// ROTAS COM PARÂMETROS (/:id DEVE VIR POR ÚLTIMO)
router.get("/:id", checa_token, (req: any, res) => controller.getId(req, res));

export default router;