"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "@/components/ui/loadingSpiner";

export default function Page() {
  const { user, loading, sessionStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && sessionStatus === "authenticated" && user) {
      router.replace("/home");
    } else if (!loading && sessionStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [user, loading, sessionStatus, router]);

  return <LoadingSpinner />;
}
