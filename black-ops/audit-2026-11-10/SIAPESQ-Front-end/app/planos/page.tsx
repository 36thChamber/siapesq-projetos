"use client";

import React, { useCallback, useEffect, useState } from "react";
import PlanGrid from "@/components/PlanGrid";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import { useSubscription } from "@/hook/useSubscription";
import { getPlanosAtivos } from "@/services/api/planos.service";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { useAuth } from "@/context/AuthContext"; 
import { Plano } from "@/services/types/plano.types";

export default function PlanosPage() {
  const { currentPlan, isLoading: subscriptionLoading, error: subscriptionError } = useSubscription();
  const { theme } = usePlatformTheme();
  const { user, loading: authLoading } = useAuth();
  const t = theme.plansTheme;

  const [plans, setPlans] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const isLogged = Boolean(user);
  const showLoading = isLoading || authLoading || (isLogged && subscriptionLoading);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setPlansError(null);

      const response = await getPlanosAtivos();
      setPlans(Array.isArray(response) ? response : []);
    } catch (error: unknown) {
      console.error("Erro ao carregar planos:", error);
      setPlansError(
        "Não foi possível carregar o catálogo de planos. Tente novamente mais tarde.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      void fetchPlans();
    }
  }, [user, authLoading, fetchPlans]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: t.pageBg }}>
      <Header />

      <main className="flex-grow py-16 flex flex-col items-center">
        <header className="text-center mb-10 px-4">
          <h1
            className="text-3xl md:text-4xl font-bold"
            style={{ color: t.titleColor }}
          >
            Escolha o plano ideal para você
          </h1>

          <p className="mt-3 text-sm md:text-base" style={{ color: t.subtitleColor }}>
            Compare os planos disponíveis e escolha a melhor opção para sua
            instituição, laboratório ou pesquisa.
          </p>

          {!showLoading && !isLogged && (
            <div
              className="mt-6 mx-auto max-w-2xl rounded-2xl border px-6 py-4"
              style={{
                backgroundColor: t.infoBannerBg,
                borderColor: t.infoBannerBorder,
                color: t.infoBannerText,
              }}
            >
              <p className="font-semibold">Quer começar sem custo?</p>
              <p className="mt-1 text-sm" style={{ color: t.subtitleColor }}>
                O plano Free fica disponível assim que você criar sua conta.
                Para contratar outros planos, basta fazer login ou se cadastrar.
              </p>
            </div>
          )}
        </header>

        <section className="w-full pb-10">
          {showLoading ? (
            <div className="flex justify-center items-center py-20">
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2"
                style={{ borderColor: t.buttonDefault }}
              />
            </div>
          ) : plansError || (isLogged && subscriptionError) ? (
            <div
              role="alert"
              className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-center text-red-800"
            >
              <p>{plansError || subscriptionError}</p>
              {plansError && (
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={() => void fetchPlans()}
                >
                  Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <PlanGrid
              plans={plans}
              currentUserPlanName={
                isLogged ? currentPlan?.planName || "Free" : "Visitante"
              }
            />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
