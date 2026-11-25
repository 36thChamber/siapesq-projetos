"use client";

import { PlanUI } from "@/services/types/plano.types";
import { PaymentMethod, CheckoutResponse } from "@/services/types/checkout.types";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

import PaymentOption from "@/components/ui/paymentOption";
import PixPaymentBox from "@/components/PixPaymentBox/indext";

interface PaymentMethodsSectionProps {
  selectedPlan: PlanUI;
  paymentMethod: PaymentMethod;
  checkoutData: CheckoutResponse | null;
  onChangePaymentMethod: (method: PaymentMethod) => void;
}

export default function PaymentMethodsSection({
  selectedPlan,
  paymentMethod,
  checkoutData,
  onChangePaymentMethod,
}: PaymentMethodsSectionProps) {
  const { theme } = usePlatformTheme();
  const t = theme.plansTheme;

  return (
    <section>
      <h1 className="text-3xl font-bold mb-6" style={{ color: t.titleColor }}>
        Contratar plano{" "}
        <span className="font-extrabold">{selectedPlan.name}</span>
      </h1>

      <h2
        className="text-xs font-extrabold tracking-[0.25em] uppercase mb-3"
        style={{ color: t.titleColor }}
      >
        Selecionar forma de pagamento
      </h2>

      <div className="space-y-3">
        <PaymentOption
          label="Pix"
          value="pix"
          selected={paymentMethod}
          onSelect={onChangePaymentMethod}
        />

        {paymentMethod === "pix" && checkoutData?.pix && (
          <PixPaymentBox pix={checkoutData.pix} />
        )}

        <PaymentOption
          label="Cartão de crédito"
          value="cartao"
          selected={paymentMethod}
          onSelect={onChangePaymentMethod}
        />

        <PaymentOption
          label="Boleto"
          value="boleto"
          selected={paymentMethod}
          onSelect={onChangePaymentMethod}
        />
      </div>
    </section>
  );
}
