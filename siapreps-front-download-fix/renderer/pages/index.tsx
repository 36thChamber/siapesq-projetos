import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoadingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    router.replace("/loadingPage");
  }, [loading, user]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* Logo */}
      <div className="mb-12">
        <img
          src="/SIAPESQ3.svg"
          alt="SIAPESQ"
          className="w-56 h-auto" // Aumentei de w-44 para w-56
        />
      </div>

      {/* Texto de carregamento */}
      <div className="flex flex-col items-center gap-3 text-base text-dark_green-600">
        <div className="w-10 h-10 rounded-full border-4 border-dark_green-500 border-t-transparent animate-spin" />
        <span className="text-sm text-dark_green-400">
          Por favor, aguarde enquanto iniciamos
        </span>
      </div>
    </div>
  );
}
