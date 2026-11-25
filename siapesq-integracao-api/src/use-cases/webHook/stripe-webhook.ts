import StripeService from "../../services/stripe-services";

export default {

    async executa(req: any) {

        return await StripeService.handleWebhook(req);
    }
}