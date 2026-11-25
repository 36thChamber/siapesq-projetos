// services/types/checkout.types.ts

export type PaymentMethod = "pix" | "boleto" | "cartao";

export interface CreateCheckoutPayload {
  id_plano: string;
  metodo_pagamento: PaymentMethod;
}

export interface CheckoutResponse {
  tipo: "redirect" | "pix";
  redirectUrl?: string;

  pagamento?: {
    id_pagamento: string;
    status: string;
  };

  pix?: {
    qrCodeBase64?: string;
    qrCode?: string;
    copyPaste?: string;
    expiresAt?: string;
  };
}
