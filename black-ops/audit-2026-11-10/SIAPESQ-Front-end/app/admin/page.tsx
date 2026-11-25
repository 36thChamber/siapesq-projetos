"use client";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import AdminTabs from "@/components/navigation/AdminTabs";
import SpeciesSection from "@/sections/SpeciesSection";
import UsersSection from "@/sections/UsersSection";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/ui/loadingSpiner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"users" | "species">("users");
  const { user, loading: authLoading, sessionStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (sessionStatus === "unauthenticated") {
        router.push("/login");
      } else if (
        sessionStatus === "authenticated" &&
        user?.tipo_usuario !== "ADMIN"
      ) {
        router.push("/"); 
      }
    }
  }, [authLoading, sessionStatus, user, router]);

  if (authLoading || !user || user.tipo_usuario !== "ADMIN") {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className="min-h-full">
        <Header />
        <AdminTabs activeTab={activeTab} onChange={setActiveTab} />
        <div className="px-6">
          {activeTab === "users" && <UsersSection />}
          {activeTab === "species" && <SpeciesSection />}
        </div>
        <Footer />
      </div>
    </>
  );
}
