import { Router } from "express";
import checa_token from "../../../middlewares/checa-token";
import AnalisesControllers from "../../../controllers/siapesq_controllers/analises-controller";

const router = Router();
const controller = new AnalisesControllers();

router.get("/:id", checa_token, (req:any, res) => controller.get(req, res));
router.get("/especie/:id_especie", checa_token, (req:any, res) => controller.getIdEspecie(req,res))
router.get("/", checa_token, (req:any, res) => controller.list(req, res));
router.post("/", checa_token, (req:any, res) => controller.create(req, res));
router.put("/", checa_token, (req:any, res) => controller.update(req, res));

export default router;
