export default class MercadoPagoService {
    static async createCheckout(body: any) {
        try {
            const { id_usuario, id_plano, periodicidade, metodo } = body;

            // Aqui depois entra a integração real com Mercado Pago
            return {
                provider: "mercadopago",
                checkout_url: "https://www.mercadopago.com.br/teste",
                dados_recebidos: {
                    id_usuario,
                    id_plano,
                    periodicidade,
                    metodo
                }
            };
        } catch (err) {
            throw err;
        }
    }

    static async handleWebhook(body: any) {
        try {
            // Aqui depois você processa o webhook real do Mercado Pago
            console.log("Webhook Mercado Pago recebido");
            console.log(body);

            return {
                recebido: true,
                provider: "mercadopago"
            };
        } catch (err) {
            throw err;
        }
    }
}