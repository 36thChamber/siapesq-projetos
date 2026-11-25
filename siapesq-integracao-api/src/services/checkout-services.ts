import CriarCheckoutUseCase from "../use-cases/checkout/criar-checkout";

export default class CheckoutService {

    static async create(body: any) {
        try {

            await CriarCheckoutUseCase.valida(body);

            return await CriarCheckoutUseCase.executa(body);

        } catch (err) {
            throw err;
        }
    }
}