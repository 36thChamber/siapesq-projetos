import { Router } from 'express'
import checa_token from '../../middlewares/checa-token'
import Especies_analisesController from '../../controllers/especies_analises-controller'

const router=Router()
const controller=new Especies_analisesController()
router.get("/",checa_token,(req:any,res:any)=>controller.list(req,res))
router.get("/:id",checa_token,(req:any,res:any)=>controller.get(req,res))
export default router