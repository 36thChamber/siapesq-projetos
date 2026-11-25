import { Router } from "express";
import GruposEspeciesController from "../../../controllers/siapesq_controllers/grupoEspecies-controller";
import checa_token from "../../../middlewares/checa-token";
const router = Router();
const controller = new GruposEspeciesController();
router.get("/", checa_token, (req: any, res) => controller.list(req, res));
router.post("/", checa_token, (req: any, res) => controller.create(req, res));

router.get("/:id/especies", (req: any, res) => controller.listEspecies(req, res));
router.get("/:id", checa_token, (req: any, res) => controller.get(req, res));

export default router;
