import { Request, Response } from "express";
import CheckoutService from "../services/checkout-services";

export default class CheckoutController {

    async create(req: any, res: Response) {
        try {

            const {
                metodo,
                metodo_pagamento, 
                ...resto
            } = req.body ?? {};

            const body = {
                ...resto,
                metodo: metodo ?? metodo_pagamento,
                id_usuario: req.id_usuario
            };

            const response = await CheckoutService.create(body);

            return res.status(200).json(response);

        } catch (err: any) {

            return res.status(400).json({
                erro: true,
                mensagem: err.message
            });
        }
    }
}