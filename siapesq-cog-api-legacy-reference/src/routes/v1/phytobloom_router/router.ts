import { Router } from 'express'
import usuarios_router from './usuarios_router'
import reservatorios_router from './reservatorios_router'
import alertas_router from './alertas_router'
import servidores_router from './servidores_router'
import tifs_router from './tifs-router'
import emails_router from './emails-router'
import esqueceuSenha_router from './esqueceuSenha-router'
import areasAlertas_router from './areasAlertas_router'

const router=Router()
router.use("/usuarios", usuarios_router)
router.use("/reservatorios",reservatorios_router)
router.use("/alertas", alertas_router)
router.use('/areasAlertas', areasAlertas_router)
router.use("/servidores", servidores_router)
router.use("/tifs",  tifs_router)
router.use("/verificarEmail", emails_router)
router.use("/esqueceuSenha", esqueceuSenha_router)
export default router
