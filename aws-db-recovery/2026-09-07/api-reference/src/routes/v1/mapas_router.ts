import { Router } from 'express'
import  MapasController from '../../controllers/mapas-controller'
import checa_token from '../../middlewares/checa-token'
const router=Router()
const controller=new MapasController()

router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/download",checa_token,(req:any,res)=>controller.get(req,res))
export default router