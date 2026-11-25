import { Router } from 'express'
import checa_token from '../middlewares/checa-token'
import requireContaAtiva from '../middlewares/require-conta-ativa'
import AnalisesController from '../controllers/analises-controller'

const router=Router()
const controller=new AnalisesController()

router.get("/", checa_token, requireContaAtiva, (req: any, res) => controller.list(req, res));
router.get("/download", checa_token, requireContaAtiva, (req: any, res) => controller.get(req, res));
router.get("/nomes", checa_token, requireContaAtiva, (req: any, res) => controller.listAnalises(req, res));
export default router
