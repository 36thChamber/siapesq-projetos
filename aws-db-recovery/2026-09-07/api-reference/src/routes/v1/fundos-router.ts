import { Router } from 'express'
import FundosController from '../../controllers/fundos-controller'
import checa_token from '../../middlewares/checa-token'
const router=Router()
const controller=new FundosController()
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/:id",checa_token,(req:any,res)=>controller.get(req,res))
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
export default router