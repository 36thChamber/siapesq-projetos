import { Router } from 'express'
import checa_token from '../../../middlewares/checa-token'
import Areas_AlertasController from '../../../controllers/phytobloom-controllers/areas_alertas-controllers'
const router=Router()
const controller=new Areas_AlertasController()

router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
router.get("/",(req:any,res)=>controller.list(req,res))
router.get("/:id_reservatorio",(req:any,res:any)=>controller.get(req,res))

export default router