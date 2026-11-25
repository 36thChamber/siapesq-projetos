import Planos from "../../models/Planos";
import StripeService from "../../services/stripe-services";
import MercadoPagoService from "../../services/mercado-pago-services";

export default {

    async valida(body: any) {

        const {
            id_usuario,
            id_plano,
            metodo
        } = body;

        if (!id_usuario) {
            throw new Error("Usuário não identificado");
        }

        if (!id_plano) {
            throw new Error("id_plano é obrigatório");
        }

        if (!metodo) {
            throw new Error("metodo é obrigatório");
        }

        if (!["cartao", "pix", "boleto"].includes(metodo)) {
            throw new Error("Método inválido");
        }
    },

    async executa(body: any) {

        const { id_plano, metodo } = body;

        // periodicidade é definida pelo próprio plano, não pelo cliente no checkout
        const plano = await Planos.findByPk(id_plano);

        if (!plano) {
            throw new Error("Plano não encontrado");
        }

        const dadosCheckout = {
            ...body,
            periodicidade: plano.periodicidade
        };

        // Stripe
        if (metodo === "cartao") {

            return await StripeService.createCheckout(dadosCheckout);
        }

        // Mercado Pago
        if (
            metodo === "pix" ||
            metodo === "boleto"
        ) {

            return await MercadoPagoService.createCheckout(dadosCheckout);
        }

        throw new Error("Método de pagamento inválido");
    }
}