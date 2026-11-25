import { Router } from 'express'
import EmbarcacaoController from '../../controllers/embarcacao-controller'
import checa_token from '../../middlewares/checa-token'
const router=Router()
const controller=new EmbarcacaoController()
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/:id",checa_token,(req:any,res:any)=>controller.get(req,res))
router.put("/",checa_token,(req:any,res:any)=>controller.update(req,res))
export default router