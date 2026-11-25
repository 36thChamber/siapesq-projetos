import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateStatusUser } from "@/services/api/admin.service";
import { DropdownItem } from "@/components/ui/dropdown";

type User = {
  id: number | string;
};

type ActionType = "APROVADO" | "REPROVADO";

export function useAdminUserActions(user: User) {
  const { user: authUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("APROVADO");

  const handleActionClick = (type: ActionType) => {
    setActionType(type);
    setModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!authUser) return; // Mantém a checagem de segurança pra ver se está logado

    try {
      // O token foi removido daqui! O BFF lida com isso.
      await updateStatusUser(
        user.id.toString(),
        actionType,
      );
      setModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  // useMemo pra não recriar a lista a cada render
  const items: DropdownItem[] = useMemo(
    () => [
      {
        label: "Aprovar",
        value: "APROVADO",
        onClick: () => handleActionClick("APROVADO"),
      },
      {
        label: "Rejeitar",
        value: "REPROVADO",
        onClick: () => handleActionClick("REPROVADO"),
      },
    ],
    [],
  );

  return {
    items,
    modalOpen,
    actionType,
    closeModal: () => setModalOpen(false),
    handleConfirm,
  };
}