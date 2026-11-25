import { Response } from "express";
import { RequestAutenticado } from "../../types/express-types";
import { Op, fn, col, where } from "sequelize";
import usuarios from "../../models/siapesq/Usuarios";
import especies from "../../models/siapesq/Especies";

export default class AdminController {
    async aprovar_usuario(req: RequestAutenticado, res: Response) {
        try {
            const { id_usuario, status } = req.body

            if (!id_usuario || !status) {
                return res.status(400).json({ error: "id_usuario e status são obrigatórios" });
            }

            const usuario = await usuarios.findByPk(id_usuario);
            if (!usuario) {
                return res.status(404).json({ error: "Usuário não encontrado" });
            }

            usuario.set({ status });
            await usuario.save();

            const { id, email, name } = usuario.get();
            return res.json({ ok: true, usuario: { id, email, name, status } });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Erro ao aprovar usuário", erro: err });
        }
    }
    async buscar_usuario(req: RequestAutenticado, res: Response) {
        try {
            const q = (req.query.q as string | undefined)?.trim();
            const status = (req.query.status as string | undefined)?.trim();

            const page = Math.max(parseInt((req.query.page as string) ?? "1", 10), 1);
            const pageSize = Math.min(
                Math.max(parseInt((req.query.pageSize as string) ?? "10", 10), 1),
                100
            );
            const offset = (page - 1) * pageSize;
            const limit = pageSize;

            const andClauses: any[] = [];

            if (q && q.length > 0) {
                const qLower = q.toLowerCase();
                andClauses.push({
                    [Op.or]: [
                        where(fn("LOWER", col("nome")), { [Op.like]: `%${qLower}%` })
                    ],
                });
            }

            if (status && status.length > 0) {
                andClauses.push({ status });
            }

            const whereAll = andClauses.length ? { [Op.and]: andClauses } : undefined;

            const { rows, count } = await (usuarios as any).findAndCountAll({
                where: whereAll,
                limit,
                offset,
                order: [["nome", "ASC"]],
                attributes: ["id_usuario", "nome", "email", "status"],
            });

            return res.json({
                page,
                pageSize,
                total: count,
                results: rows,
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Erro ao buscar usuários" });
        }
    }

    async buscar_especie(req: RequestAutenticado, res: Response) {
        try {
            const q = (req.query.q as string)?.trim();

            if (!q) {
                return res.status(200).json([]);
            }

            const especies_banco = await especies.findAll({
                where: {
                    nome: { [Op.iLike]: `%${q}%` },
                },
                attributes: ["id_especie", "nome"],
                order: [["nome", "ASC"]],
                limit: 20,
            });

            return res.status(200).json(especies_banco);
        } catch (err) {
            console.error("Erro ao buscar espécies:", err);
            return res.status(500).json({ error: "Erro ao buscar espécies" });
        }
    }

}
