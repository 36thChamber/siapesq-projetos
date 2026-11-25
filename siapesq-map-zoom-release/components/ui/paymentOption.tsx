"use client";

import React from "react";
import { PaymentMethod } from "@/services/types/checkout.types";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

interface PaymentOptionProps {
  label: string;
  value: PaymentMethod;
  selected: PaymentMethod;
  onSelect: (value: PaymentMethod) => void;
}

export default function PaymentOption({
  label,
  value,
  selected,
  onSelect,
}: PaymentOptionProps) {
  const { theme } = usePlatformTheme();
  const t = theme.plansTheme;

  const isSelected = selected === value;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="w-full border rounded-lg bg-white px-4 py-3 flex items-center justify-between transition-all cursor-pointer hover:brightness-98"
      style={
        isSelected
          ? {
              borderColor: t.selectedOptionColor,
              boxShadow: `0 0 0 1px ${t.selectedOptionColor}`,
            }
          : { borderColor: "#D1D5DB" }
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          style={
            isSelected
              ? { borderColor: t.selectedOptionColor, backgroundColor: t.selectedOptionColor }
              : { borderColor: "#9CA3AF" }
          }
        >
          {isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-white block" />
          )}
        </span>

        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>

      <span className="text-xs text-gray-400">
        {value === "pix" && "PIX"}
        {value === "cartao" && "Crédito"}
        {value === "boleto" && "Boleto"}
      </span>
    </button>
  );
}
