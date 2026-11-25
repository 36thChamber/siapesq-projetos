import { Router } from 'express'
import PortosController from '../../controllers/portos-controller'
import checa_token from '../../middlewares/checa-token'
const router=Router()
const controller=new PortosController()
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/:id",checa_token,(req:any,res)=>controller.get(req,res))
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
export default router