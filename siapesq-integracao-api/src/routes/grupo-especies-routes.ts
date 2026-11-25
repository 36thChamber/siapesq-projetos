import { Router } from "express";
import asyncHandler from "../middlewares/async-handler";
import checa_admin from "../middlewares/checa-admin";
import checa_token from "../middlewares/checa-token";
import GruposEspeciesController from "../controllers/grupoEspecies-controller";

const router = Router();
const controller = new GruposEspeciesController();
router.get("/", checa_token, asyncHandler((req: any, res) => controller.listar(req, res)));
router.post("/", checa_token, checa_admin, asyncHandler((req: any, res) =>
  controller.criar(req, res)
));

router.get(
  "/:id_gruposespecies/especies",checa_token,asyncHandler((req: any, res) => 
    controller.listarEspecies(req, res)),
);

router.get("/:id_gruposespecies", checa_token, asyncHandler((req: any, res) =>
  controller.buscarPorId(req, res)
));

export default router;
