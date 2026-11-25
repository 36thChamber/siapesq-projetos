import { Router } from 'express'
import enviarEmail from './enviarEmail-router'


const router=Router()
router.use("/landingPage",enviarEmail)
export default router

