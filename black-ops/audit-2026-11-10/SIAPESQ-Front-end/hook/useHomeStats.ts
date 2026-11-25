import { useState, useEffect } from "react";
import { getPlatformStats, DashboardStats } from "@/services/api/admin.service";
import { useAuth } from "@/context/AuthContext";

export function useHomeStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!user || user.tipo_usuario?.toLowerCase() !== "admin") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getPlatformStats();
        setStats(response);
      } catch (err: any) {
        if (err.response?.status === 403) {
          console.warn("Aviso: Usuário sem permissão para carregar dados administrativos (403).");
          setStats(null);
          setError(null);
          return;
        }

        setError("Erro ao carregar estatísticas");
        console.error("Erro em loadStats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

  return { stats, loading, error };
}