import { Router } from "express";
import reservatorios_router from "./reservatorios-router";
import usuarios_router from "./usuarios-router";
import areas_alertas_router from "./areas-alertas-routes";
import alertas_router from "./alertas-routes";
import analises_router from "./analises-routes";
import verificacao_email_router from "./verificacao-email-routes";
import recuperacao_senha_router from "./recuperacao-senha-routes";

const router = Router();

router.use("/usuarios", usuarios_router);
router.use("/reservatorios", reservatorios_router);
router.use("/areas-alertas", areas_alertas_router);
router.use("/alertas", alertas_router);
router.use("/analises", analises_router);
router.use("/verificarEmail", verificacao_email_router);
router.use("/", recuperacao_senha_router);

export default router;

