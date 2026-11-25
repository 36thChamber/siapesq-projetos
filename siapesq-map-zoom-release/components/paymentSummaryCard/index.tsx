"use client";

import React from "react";
import { PlanUI } from "@/services/types/plano.types";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

interface PaymentSummaryCardProps {
  selectedPlan: PlanUI;
  loading: boolean;
  onFinishPayment: () => void;
}

export default function PaymentSummaryCard({
  selectedPlan,
  loading,
  onFinishPayment,
}: PaymentSummaryCardProps) {
  const { theme } = usePlatformTheme();
  const t = theme.plansTheme;

  const periodicityLabel =
    selectedPlan.periodicity === "anual" ? "Anual" : "Mensal";

  return (
    <aside
      className="text-white rounded-xl shadow-xl p-7"
      style={{ backgroundColor: t.summaryCardBg }}
    >
      <h2 className="text-[10px] uppercase tracking-[0.35em] text-white/60 mb-8">
        Resumo da compra
      </h2>

      <div className="mb-6">
        <p className="text-sm">Assinatura {periodicityLabel}</p>
        <p className="text-xs text-white/60">Plano: {selectedPlan.name}</p>
      </div>

      <div className="border-t border-white/20 pt-5 mb-8">
        <p className="text-[10px] uppercase tracking-widest text-white/60 mb-2">
          Valor total
        </p>
        <p className="text-2xl font-bold">R$ {selectedPlan.price}</p>
      </div>

      <button
        type="button"
        onClick={onFinishPayment}
        disabled={loading}
        className="w-full py-3 rounded-lg text-sm font-bold transition-all hover:brightness-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        style={{ backgroundColor: t.ctaButtonBg, color: "#FFFFFF" }}
      >
        {loading ? "Processando..." : "Finalizar Pagamento →"}
      </button>

      <p className="text-[10px] text-center text-white/50 mt-4">
        Ambiente seguro. Ao finalizar você concorda com nossos termos de uso.
      </p>
    </aside>
  );
}
