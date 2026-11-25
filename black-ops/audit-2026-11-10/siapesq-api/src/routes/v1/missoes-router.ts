import { Router } from 'express'
import MissaoController from '../../controllers/missoes-controller'
import checa_token from '../../middlewares/checa-token'
const router=Router()
const controller=new MissaoController()
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/:id",checa_token,(req:any,res)=>controller.get(req,res))
router.get("/:id/detalhes",checa_token,(req:any,res)=>controller.getDetalhesMissao(req,res))
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
export default router