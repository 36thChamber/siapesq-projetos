import { Router } from 'express';
import UsuariosAtivosHttpService from '../services/http/usuarios-ativos-http-service';
import checa_token from '../middlewares/checa-token';
import checa_admin from '../middlewares/checa-admin';

const router = Router();
const httpService = new UsuariosAtivosHttpService();
const checaToken = checa_token as any;
const checaAdmin = checa_admin as any;

// O cadastro cria o registro ativo do proprio usuario; login consulta o proprio.
// As demais operacoes sao administrativas (pagina de administracao).
router.post("/", checaToken, (req: any, res, next) => httpService.create(req, res, next));
router.get("/:id", checaToken, (req: any, res, next) => httpService.getId(req, res, next));
router.get("/", checaToken, checaAdmin, (req: any, res, next) => httpService.list(req, res, next));
router.put("/", checaToken, checaAdmin, (req: any, res, next) => httpService.update(req, res, next));
router.delete("/", checaToken, checaAdmin, (req: any, res, next) => httpService.delete(req, res, next));
export default router;