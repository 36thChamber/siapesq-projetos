import { Router } from 'express'
import checa_token from '../../../middlewares/checa-token'
import AnalisesController from '../../../controllers/siapesq_controllers/analisesBucket-controller'
const router=Router()
const controller=new AnalisesController()

router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/download",checa_token,(req:any,res)=>controller.get(req,res))
router.get("/downloadCsv",checa_token,(req:any,res)=>controller.getCsv(req,res))
export default router