"use client";

import { ReusableDropdown } from "../ui/dropdown";
import { useAdminUserActions } from "@/hook/useAdminUserActions";
import Modal from "../ui/modal";
import { User } from "@/utils/users";
import { DotIcon, AttentionIcon } from "@/components/icons";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

export default function AdminUserActionsDropdown({ user }: { user: User }) {
  const { items, modalOpen, closeModal, handleConfirm } =
    useAdminUserActions(user);
  const { theme } = usePlatformTheme();

  if (user.status !== "PENDENTE") return null;

  return (
    <>
      <ReusableDropdown
        trigger={<DotIcon size={18} />}
        items={items}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        message="Você tem certeza?"
        icon={<AttentionIcon size={50} color={theme.colors.primary[500]} />}
        buttons={[
          { label: "Sim", onClick: handleConfirm, variant: "primary" },
          { label: "Não", onClick: closeModal, variant: "secondary" },
        ]}
      />
    </>
  );
}
