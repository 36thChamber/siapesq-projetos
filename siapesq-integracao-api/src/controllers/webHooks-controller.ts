import { Request, Response } from "express";
import WebhooksService from "../services/web-hooks-services";

export default class WebhooksController {

    async stripe(req: Request, res: Response) {
        try {

            const response = await WebhooksService.stripe(req);

            return res.status(200).json(response);

        } catch (err: any) {

            return res.status(400).json({
                erro: true,
                mensagem: err.message
            });
        }
    }

    async mercadopago(req: Request, res: Response) {
        try {

            const response = await WebhooksService.mercadopago(req.body);

            return res.status(200).json(response);

        } catch (err: any) {

            return res.status(400).json({
                erro: true,
                mensagem: err.message
            });
        }
    }
}