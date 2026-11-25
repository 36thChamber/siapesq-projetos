// src/routes/router.ts
import { Router } from "express";

import artesDePescaRouter from "./artes-de-pesca-routes";
import embarcacoesRelatoriosRouter from "./embarcacoes-relatorios-routes";
import embarcacoesRouter from "./embarcacoes-routes";
import portosRouter from "./portos-routes";
import relatoriosRouter from "./relatorios-routes";
import usuarios_router from "./usuarios-routes";
import usuariosAtivos_router from "./usuarios-ativos-routes";
import especiesRouter from "./especies-routes";
import fundosRouter from "./fundos-routes";
import iscasRouter from "./iscas-routes";
import lancesRouter from "./lances-routes";
import ocorrenciasLanceRouter from "./ocorrencias-lance-routes";
import missoesRouter from "./missoes-routes";
import camposArtesDePescaRouter from "./campos-arte-de-pesca-routes";
import analisesRouter from "./analises-routes";
import incidentesRouter from "./incidentes-routes"; // NOVO IMPORT
import syncRouter from "./sync-routes";

import EmbarcacoesHttpService from "./../services/http/embarcacoes-http-service";
import checa_token from "./../middlewares/checa-token";

const router = Router();
const embarcacoesHttpService = new EmbarcacoesHttpService();
const checaToken = checa_token as any;

router.get("/me/embarcacoes", checaToken, (req: any, res: any, next: any) => embarcacoesHttpService.listByMestre(req, res, next));
router.use("/artes-de-pesca", artesDePescaRouter);
router.use("/embarcacoes", embarcacoesRouter);
router.use("/portos", portosRouter);
router.use("/especies", especiesRouter);
router.use("/fundos", fundosRouter);
router.use("/iscas", iscasRouter);
router.use("/lances", lancesRouter);
router.use("/ocorrencias-lance", ocorrenciasLanceRouter);
router.use("/relatorios", relatoriosRouter);
router.use("/embarcacoes", embarcacoesRelatoriosRouter);
router.use("/missoes", missoesRouter);
router.use("/usuarios-ativos", usuariosAtivos_router);
router.use("/usuarios", usuarios_router);
router.use("/campos-arte-de-pesca", camposArtesDePescaRouter);
router.use('/analises', analisesRouter);
router.use('/incidentes', incidentesRouter); // NOVA ROTA
router.use('/sync', syncRouter);

export default router;
