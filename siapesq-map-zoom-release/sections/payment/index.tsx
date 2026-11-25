"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PlanUI } from "@/services/types/plano.types";
import { createCheckout } from "@/services/api/checkout.service";
import {
  PaymentMethod,
  CheckoutResponse,
} from "@/services/types/checkout.types";
import { useAuth } from "@/context/AuthContext";

import PaymentSummaryCard from "@/components/paymentSummaryCard";
import PaymentMethodsSection from "./PaymentMethodsSection";
import Modal from "@/components/ui/modal";

export default function PaymentSection() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<PlanUI | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(
    null,
  );

  const [loading, setLoading] = useState(false);

  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState(
    "Não foi possível iniciar o pagamento. Tente novamente.",
  );

  useEffect(() => {
    const storedPlan = sessionStorage.getItem("selectedPlan");

    if (!storedPlan) {
      router.push("/planos");
      return;
    }

    try {
      const parsedPlan = JSON.parse(storedPlan);
      setSelectedPlan(parsedPlan);
    } catch (error) {
      console.error("Erro ao carregar plano selecionado:", error);
      sessionStorage.removeItem("selectedPlan");
      router.push("/planos");
    }
  }, [router]);

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }

    return "Não foi possível iniciar o pagamento. Tente novamente.";
  };

  const handleFinishPayment = async () => {
    if (!selectedPlan) return;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      setCheckoutData(null);

      const response = await createCheckout(
        {
          id_plano: selectedPlan.id,
          metodo_pagamento: paymentMethod,
        },
      );

      if (response.tipo === "redirect" && response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }

      if (response.tipo === "pix") {
        setCheckoutData(response);
      }
    } catch (error) {
      console.error("Erro ao iniciar pagamento:", error);

      setPaymentErrorMessage(getErrorMessage(error));
      setIsErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPlan) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-[#172554] font-semibold">Carregando pagamento...</p>
      </main>
    );
  }

 return (
  <>
    <main className="flex-1 w-full px-4 sm:px-6 py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          <div className="w-full min-w-0">
            <PaymentMethodsSection
              selectedPlan={selectedPlan}
              paymentMethod={paymentMethod}
              checkoutData={checkoutData}
              onChangePaymentMethod={setPaymentMethod}
            />
          </div>

          <div className="w-full min-w-0">
            <PaymentSummaryCard
              selectedPlan={selectedPlan}
              loading={loading}
              onFinishPayment={handleFinishPayment}
            />
          </div>
        </div>
      </div>
    </main>

    <Modal
      isOpen={isErrorModalOpen}
      onClose={() => setIsErrorModalOpen(false)}
      icon={
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-red-600 text-3xl font-bold">!</span>
        </div>
      }
      message={
        <div>
          <h2 className="text-xl font-bold text-[#172554] mb-3">
            Erro no pagamento
          </h2>

          <p className="text-gray-600">{paymentErrorMessage}</p>
        </div>
      }
      buttons={[
        {
          label: "Tentar novamente",
          variant: "primary",
          onClick: () => {
            setIsErrorModalOpen(false);
            handleFinishPayment();
          },
        },
        {
          label: "Fechar",
          variant: "secondary",
          onClick: () => setIsErrorModalOpen(false),
        },
      ]}
    />
  </>
 )
}
