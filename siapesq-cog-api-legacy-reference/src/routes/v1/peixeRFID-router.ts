import { Router } from 'express';
import PeixeRFIDController from '../../controllers/dev-PeixeRFID-controller/peixeRFID-controller';
import checa_token from '../../middlewares/checa-token';

const router = Router();
const controller = new PeixeRFIDController();

router.post("/", checa_token, (req:any, res) => controller.create(req, res));
router.get("/", checa_token, (req:any, res) => controller.list(req, res));
router.get("/:id", checa_token, (req:any, res) => controller.getId(req, res));
router.post("/:id", checa_token, (req:any, res) => controller.delete(req, res));

export default router;
