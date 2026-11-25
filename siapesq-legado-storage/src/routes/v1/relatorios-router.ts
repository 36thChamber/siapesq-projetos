import { Router } from 'express'
import RelatorioController from '../../controllers/relatorio-controller'
import checa_token from '../../middlewares/checa-token'
import { upload } from '../../middlewares/multer'
const router=Router()
const controller=new RelatorioController()
router.post("/",checa_token,(req:any,res)=>controller.salvar(req,res))
router.post("/upload",checa_token,upload.single('pdf'),(req:any,res)=>controller.upload(req,res))
router.get("/arquivo/:key",checa_token,(req:any,res)=>controller.arquivo(req,res))
export default router