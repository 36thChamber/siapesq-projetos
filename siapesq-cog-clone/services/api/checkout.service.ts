// services/api/checkout.service.ts
import { post } from "@/services/api/apiClient";
import {
  PaymentMethod,
  CreateCheckoutPayload,
  CheckoutResponse,
} from "@/services/types/checkout.types";

export type { PaymentMethod, CreateCheckoutPayload, CheckoutResponse };

export async function createCheckout(
  payload: CreateCheckoutPayload,
): Promise<CheckoutResponse> {
  try {
    return await post<CheckoutResponse, CreateCheckoutPayload>(
      "/checkout",
      payload,
    );
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao criar checkout.",
    );
  }
}
