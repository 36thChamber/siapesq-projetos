import PaymentSimulation, { paymentSimulationEnabled } from "./payment-simulation";

export default class CheckoutService {

    static async create(body: any) {
        if (paymentSimulationEnabled()) return PaymentSimulation.create({ id_usuario: body.id_usuario, id_plano: body.id_plano, metodo: body.metodo });
        throw { status: 503, message: "Pagamento indisponível neste ambiente." };
    }
}
