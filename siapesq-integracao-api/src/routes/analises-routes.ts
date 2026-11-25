import { Router } from "express";
import asyncHandler from "../middlewares/async-handler";
import checa_token from "../middlewares/checa-token";
import checa_quota_especie from "../middlewares/checa-quota-especie";
import AnalisesControllers from "../controllers/analises-controller";

const router = Router();
const controller = new AnalisesControllers();

router.get("/dados_plataforma", asyncHandler((req: any, res) => controller.dados_plataforma(req, res)))
router.get("/:id_analise/tif", checa_token, asyncHandler((req:any, res) => controller.getTif(req, res)));
router.get("/:id_analise/tif/access", checa_token, asyncHandler((req:any, res) => controller.getTifAccess(req, res)));
router.get("/especie/:id_especie/ocorrencias", checa_token, asyncHandler((req:any, res) => controller.getCsvOcorrencias(req, res)));
router.get("/:id", checa_token, asyncHandler((req:any, res) => controller.get(req, res)));
router.get("/especie/:id_especie", checa_token, checa_quota_especie("id_especie"), asyncHandler((req:any, res) => controller.getIdEspecie(req,res)))
router.get("/", checa_token, asyncHandler((req:any, res) => controller.list(req, res)));
router.post("/", checa_token, asyncHandler((req:any, res) => controller.create(req, res)));
router.put("/", checa_token, asyncHandler((req:any, res) => controller.update(req, res)));

export default router;
