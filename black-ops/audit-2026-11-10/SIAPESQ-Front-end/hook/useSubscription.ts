import { useState, useEffect } from "react";
import { getAssinaturasUsuario } from "@/services/api/assinaturas.service";
import {
  UserSubscription,
  UserSubscriptionStatus,
} from "@/services/types/assinatura.types";
import { useAuth } from "@/context/AuthContext";

export function useSubscription() {
  const { user } = useAuth();

  const [currentPlan, setCurrentPlan] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!user) {
          setIsLoading(false);
          setCurrentPlan(null);
          return;
        }

        const userId = user.id_usuario;
        if (!userId) {
          throw new Error("ID do usuário ausente");
        }

        const assinaturaData = await getAssinaturasUsuario(userId);
        if (assinaturaData) {
          const mappedPlan: UserSubscription = {
            planName: assinaturaData.plano?.nome || "Free",
            status:
              (assinaturaData.status as UserSubscriptionStatus) || "inativa",
            expiresAt: assinaturaData.data_fim ? String(assinaturaData.data_fim) : null,
            price: assinaturaData.plano?.valor_mensal ?? 0,
          };

          setCurrentPlan(mappedPlan);
        } else {
          setCurrentPlan(null);
        }
      } catch (err) {
        console.error("Erro ao buscar assinatura:", err);
        setError("Não foi possível carregar as informações da assinatura.");
        setCurrentPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  return { currentPlan, isLoading, error };
}
