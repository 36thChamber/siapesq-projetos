
"use client";

import { useEffect, useState } from "react";
import { getPlatformStats } from "@/services/api/admin.service";
import type { DashboardStats } from "@/services/types/admin.types";

export function useHomeStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const data = await getPlatformStats();

        if (active) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        console.error("Erro ao carregar dados da plataforma:", err);

        if (active) {
          setError("Não foi possível carregar os indicadores.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  return { stats, loading, error };
}
