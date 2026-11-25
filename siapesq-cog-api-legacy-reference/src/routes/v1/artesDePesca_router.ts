import { Router } from 'express';
import checa_token from '../../middlewares/checa-token';
import artesDePescaController from '../../controllers/artesDePesca-controller';

const router = Router()
const controller=new artesDePescaController()

router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.get("/:id",checa_token,(req:any,res)=>controller.get(req,res))
export default router
