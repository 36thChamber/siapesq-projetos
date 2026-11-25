import stripe_webhook_use_case from "../use-cases/webHook/stripe-webhook";
import mercadopago_webhook_use_case from "../use-cases/webHook/mercadopago-webhook";

export default class WebhooksService {

    static async stripe(req: any) {
        try {

            return await stripe_webhook_use_case.executa(req);

        } catch (err) {
            throw err;
        }
    }

    static async mercadopago(body: any) {
        try {

            return await mercadopago_webhook_use_case.executa(body);

        } catch (err) {
            throw err;
        }
    }
}