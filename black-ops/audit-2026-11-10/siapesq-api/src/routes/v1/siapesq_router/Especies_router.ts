import { Router } from 'express'
import EspeciesControllers from '../../../controllers/siapesq_controllers/especies-controller'
import checa_token from '../../../middlewares/checa-token'
const router=Router()
const controller=new EspeciesControllers()
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))

router.get("/:id",checa_token,(req:any,res)=>controller.get(req,res))

export default router