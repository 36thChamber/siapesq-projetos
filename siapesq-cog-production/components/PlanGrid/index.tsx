import React from "react";
import PlanCard from "../PlanCard";
import { PlanAPI, PlanUI } from "@/services/types/plano.types";

const transformPlanData = (
  apiPlan: PlanAPI,
  currentUserPlanName: string
): PlanUI => {
  const features = [];

  if (apiPlan.especies_ilimitadas) {
    features.push("Espécies ilimitadas");
  } else {
    features.push(`${apiPlan.especies_disponiveis} espécies disponíveis`);
  }

  features.push("Predições para as espécies disponíveis");

  if (apiPlan.nome === "Professional") {
    features.push("6 downloads das análises");
  }

  if (apiPlan.nome.toLowerCase().includes("research")) {
    features.push("Download das análises disponível");
  }

  return {
    id: apiPlan.id_plano,
    name: apiPlan.nome,
    price: apiPlan.valor_mensal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    }),
    periodicity: apiPlan.periodicidade,
    features: features,
    isRecommended: apiPlan.nome === "Professional",
    isCurrent:
      apiPlan.nome.toLowerCase() === currentUserPlanName.toLowerCase(),
  };
};

interface PlanGridProps {
  plans: PlanAPI[];
  currentUserPlanName: string;
}

export default function PlanGrid({
  plans,
  currentUserPlanName,
}: PlanGridProps) {
  const safePlans = Array.isArray(plans) ? plans : [];

  const activePlans = safePlans
    .filter((p) => p.ativo)
    .map((p) => transformPlanData(p, currentUserPlanName));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full max-w-[1200px] mx-auto px-4">
      {activePlans.length > 0 ? (
        activePlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))
      ) : (
        <p className="col-span-full text-center text-gray-500 py-10">
          Nenhum plano disponível no momento.
        </p>
      )}
    </div>
  );
}