import { Router } from 'express';
import checa_token from '../middlewares/checa-token';
import requireContaAtiva from '../middlewares/require-conta-ativa';
import { checa_api_key_externa } from '../middlewares/checa-api-key';
import AlertasController from '../controllers/alertas-controller';

const router = Router();
const controller = new AlertasController();


router.get("/", checa_token, requireContaAtiva, (req: any, res) => controller.list(req, res));
router.get("/:id", checa_token, requireContaAtiva, (req: any, res) => controller.get(req, res));


router.post("/", checa_api_key_externa, (req: any, res) => controller.create(req, res));
router.post("/bulk", checa_api_key_externa, (req: any, res) => controller.createBulk(req, res));


router.put("/:id", checa_token, requireContaAtiva, (req: any, res) => controller.update(req, res));


router.delete("/:id", checa_token, requireContaAtiva, (req: any, res) => controller.delete(req, res));

export default router;
