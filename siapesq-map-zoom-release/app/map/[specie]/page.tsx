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
    <div className="h-screen flex flex-col">
      <Header />

      <main className="flex-1 min-h-0 relative">
        <MapSection key={specie} mode="full" specie={specie} />
      </main>

      <Footer />
    </div>
  );
}
