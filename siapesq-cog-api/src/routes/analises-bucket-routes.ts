import { Router } from 'express'
import asyncHandler from '../middlewares/async-handler'
import checa_token from '../middlewares/checa-token'
import AnalisesController from "../controllers/analisesBucket-controller"
const router=Router()
const controller=new AnalisesController()

router.get("/",checa_token,asyncHandler((req:any,res)=>controller.list(req,res)))
router.get("/download",checa_token,asyncHandler((req:any,res)=>controller.get(req,res)))
router.get("/downloadCsv",checa_token,asyncHandler((req:any,res)=>controller.getCsv(req,res)))
export default router
