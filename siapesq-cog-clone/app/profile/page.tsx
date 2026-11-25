"use client";

import ProfileSection from "@/sections/ProfileSection";
import SubscriptionSummary from "@/components/SubscriptionSummary";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header"; // Importamos o Header aqui
import { useSubscription } from "@/hook/useSubscription";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/ui/loadingSpiner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Personal() {
  const { currentPlan, isLoading, error } = useSubscription();
  const { user, loading: authLoading, sessionStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authLoading, sessionStatus, router]);

  const handleManagePlan = () => {
    router.push('/planos');
  };

  if (authLoading || !user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
      {/* 1. Header fora do main para ocupar a largura total, igual na Home */}
      <Header />

      {/* 2. Main com items-center para centralizar os cards no meio da tela */}
      <main className="flex-1 flex flex-col items-center px-4 py-10">
        
        {/* 3. Container mestre que segura os cards alinhados */}
        <div className="w-full max-w-[807px] flex flex-col gap-6">
          <ProfileSection />
          
          <SubscriptionSummary 
            currentPlan={currentPlan}
            isLoading={isLoading}
            error={error}
            onManage={handleManagePlan}
          />
        </div>

      </main>

      <Footer />
    </div>
  );
}
