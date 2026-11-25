import { Router } from "express";
import TifsControllers from "../../../controllers/phytobloom-controllers/tifs-controllers";
import checa_token from "../../../middlewares/checa-token";

const router =  Router()
const controllers = new TifsControllers()

router.get('/listar', checa_token, (req: any, res:any) => controllers.listar(req,res))
router.get('/download', checa_token, (req: any, res: any) => controllers.download(req, res))

export default router