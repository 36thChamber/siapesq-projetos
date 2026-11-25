"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import dynamic from "next/dynamic";

const MapSection = dynamic(() => import("@/sections/sectionMap"), { ssr: false });
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/ui/loadingSpiner";

interface PageMapProps {
  params: Promise<{ specie: string }>;
}

export default function PageMap({ params }: PageMapProps) {
  const { specie } = use(params);
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
    <div className="flex min-h-[calc(100dvh-var(--test-banner-height))] flex-col md:h-[calc(100dvh-var(--test-banner-height))]">
      <Header />

      <main className="relative z-0 h-[calc(100dvh-4rem-var(--test-banner-height))] flex-none md:h-auto md:min-h-0 md:flex-1">
        <MapSection key={specie} mode="full" specie={specie} />
      </main>

      <Footer />
    </div>
  );
}
