"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PlanUI } from "@/services/types/plano.types";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { useAuth } from "@/context/AuthContext"; 

interface PlanCardProps {
  plan: PlanUI;
}

export default function PlanCard({ plan }: PlanCardProps) {
  const router = useRouter();
  const { theme } = usePlatformTheme();
  const { user, loading: authLoading } = useAuth();
  const t = theme.plansTheme;

  const { name, price, features, isRecommended, isCurrent, periodicity } = plan;

  const handleClick = () => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    sessionStorage.setItem("selectedPlan", JSON.stringify(plan));
    router.push(`/payment?planId=${plan.id}`);
  };

  return (
    <div
      className={`relative flex flex-col rounded-xl border overflow-hidden transition-all ${
        isRecommended
          ? "scale-105 shadow-xl z-10"
          : "bg-white shadow-sm"
      }`}
      style={
        isRecommended
          ? { backgroundColor: t.recommendedCardBg, borderColor: t.recommendedCardBg }
          : { borderColor: "#E5E7EB" }
      }
    >
      {isRecommended && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider z-20 whitespace-nowrap"
          style={{ backgroundColor: t.badgeBg, color: t.badgeText }}
        >
          Mais Popular
        </div>
      )}

      <div
        className="py-8 px-6 text-center"
        style={{
          backgroundColor: isRecommended ? t.recommendedCardBg : t.cardHeaderBg,
          color: isRecommended ? t.recommendedCardText : t.titleColor,
        }}
      >
        <h3 className="text-xl font-bold mb-2">{name}</h3>

        <div>
          <span className="text-2xl font-bold">
            R$ {price === "0,00" ? "0" : price}
          </span>

          <span className="text-sm opacity-75">
            {periodicity === "anual" ? "/ano" : "/mês"}
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow bg-white">
        <ul className="flex-grow space-y-3 mb-8">
          {features.map((feature, index) => (
            <li
              key={index}
              className="text-sm text-gray-600 flex items-start gap-2"
            >
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill="none"
                stroke={t.featureCheckColor}
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={handleClick}
          disabled={isCurrent || authLoading}
          className="w-full py-3 rounded-lg font-bold transition-all hover:brightness-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundColor: isRecommended ? t.buttonRecommended : t.buttonDefault,
            color: "#FFFFFF",
          }}
        >
          {isCurrent ? "Plano atual" : "Contratar"}
        </button>
      </div>
    </div>
  );
}