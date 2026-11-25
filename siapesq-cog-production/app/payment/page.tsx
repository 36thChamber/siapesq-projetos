"use client";

import React, { useEffect } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import PaymentSection from "@/sections/payment";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/ui/loadingSpiner";
import { useRouter } from "next/navigation";

export default function PaymentPage() {
  const { theme } = usePlatformTheme();
  const t = theme.plansTheme;
  const { user, loading: authLoading, sessionStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authLoading, sessionStatus, router]);

  if (authLoading || !user) {
    return <LoadingSpinner />;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: t.pageBg }}
    >
      <Header />
      <PaymentSection />
      <Footer />
    </div>
  );
}
