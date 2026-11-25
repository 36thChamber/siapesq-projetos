import { Router } from "express";
import checa_token from "../middlewares/checa-token";
import checa_api_key from "../middlewares/checa-api-key";
import requireContaAtiva from "../middlewares/require-conta-ativa";
import ReservatorioController from "../controllers/reservatorios-controller";

const router = Router();
const controller = new ReservatorioController();

router.post("/", checa_token, requireContaAtiva, (req: any, res) =>
  controller.create(req, res)
);

// Aceita x-api-key (integrações servidor-a-servidor, ex.: acolite_application)
// com fallback para JWT, mesmo padrão já usado em outras rotas internas.
router.get("/", checa_api_key, requireContaAtiva, (req: any, res) =>
  controller.list(req, res)
);

router.get("/usuario/:id", checa_token, requireContaAtiva, (req: any, res) =>
  controller.listByUsuario(req, res)
);

router.get("/:id", checa_api_key, requireContaAtiva, (req: any, res) =>
  controller.get(req, res)
);

router.put("/:id", checa_token, requireContaAtiva, (req: any, res) =>
  controller.update(req, res)
);

router.patch("/:id/prioridade", checa_token, requireContaAtiva, (req: any, res) =>
  controller.updatePrioridade(req, res)
);

router.patch("/:id/favorito", checa_token, requireContaAtiva, (req: any, res) =>
  controller.updateFavorito(req, res)
);

router.delete("/:id", checa_token, requireContaAtiva, (req: any, res) =>
  controller.delete(req, res)
);

export default router;
