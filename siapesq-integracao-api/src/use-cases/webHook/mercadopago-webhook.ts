import MercadoPagoService from "../../services/mercado-pago-services";

export default {

    async executa(body: any) {

        return await MercadoPagoService.handleWebhook(body);
    }
}