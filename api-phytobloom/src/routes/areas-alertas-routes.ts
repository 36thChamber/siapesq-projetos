// areas-alertas.routes.ts
import { Router } from 'express';
import checa_token from '../middlewares/checa-token';
import requireContaAtiva from '../middlewares/require-conta-ativa';
import Areas_AlertasController from '../controllers/areas-alertas-controller';

const router = Router();
const controller = new Areas_AlertasController();

router.post("/", checa_token, requireContaAtiva, (req: any, res) => controller.create(req, res));
router.get("/", checa_token, requireContaAtiva, (req: any, res) => controller.list(req, res));
router.get("/reservatorio/:id_reservatorio", checa_token, requireContaAtiva, (req: any, res) => controller.listByReservatorio(req, res));
router.get("/:id", checa_token, requireContaAtiva, (req: any, res) => controller.get(req, res));
router.put("/:id", checa_token, requireContaAtiva, (req: any, res) => controller.update(req, res));
router.delete("/:id", checa_token, requireContaAtiva, (req: any, res) => controller.delete(req, res));

export default router;
