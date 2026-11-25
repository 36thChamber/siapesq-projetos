import { Router } from 'express'
import InformacoesEspeciesController from '../../../controllers/siapesq_controllers/informacoesEspecies-controller'
import checa_token from '../../../middlewares/checa-token'
const router = Router()
const controller = new InformacoesEspeciesController()
router.get("/", checa_token, (req: any, res) => controller.list(req, res))
router.post("/", checa_token, (req: any, res) => controller.create(req, res))

router.get("/:id", checa_token, (req: any, res) => controller.get(req, res))
router.delete("/:id", checa_token, (req: any, res) => controller.delete(req, res))
export default router