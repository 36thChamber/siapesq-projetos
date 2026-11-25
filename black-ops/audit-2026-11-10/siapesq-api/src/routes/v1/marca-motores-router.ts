import { Router } from 'express'
import MarcaMotoresController from '../../controllers/marca-motores-controller'
import checa_token from '../../middlewares/checa-token'
const router=Router()
const controller=new MarcaMotoresController()
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/:id",checa_token,(req:any,res)=>controller.get(req,res))
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
export default router