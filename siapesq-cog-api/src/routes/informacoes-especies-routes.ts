import { Router } from "express";
import InformacoesEspeciesController from "../controllers/informacoesEspecies-controller";
import asyncHandler from "../middlewares/async-handler";
import checa_admin from "../middlewares/checa-admin";
import checa_token from "../middlewares/checa-token";
import checa_quota_informacao from "../middlewares/checa-quota-informacao";

const router = Router();
const controller = new InformacoesEspeciesController();

// Listagem: não dá para aplicar quota sem saber a espécie. Exija
// `?id_especie=` e valide a quota dessa espécie; ou restrinja a admin.
router.get(
  "/",
  checa_token,
  asyncHandler((req: any, res) => controller.list(req, res)),
);

router.post(
  "/",
  checa_token,
  checa_admin,
  asyncHandler((req: any, res) => controller.create(req, res)),
);

router.get(
  "/:id",
  checa_token,
  checa_quota_informacao(),
  asyncHandler((req: any, res) => controller.get(req, res)),
);

router.delete(
  "/:id",
  checa_token,
  checa_admin,
  asyncHandler((req: any, res) => controller.delete(req, res)),
);

export default router;