import { UserStatus } from "@/utils/users";

interface UserStatusBadgeProps {
  status: UserStatus;
}

const statusConfig: Record<
  UserStatus,
  { bgColor: string; label: string }
> = {
  APROVADO: {
    bgColor: "bg-[#86BD51]",
    label: "Aprovado",
  },
  REPROVADO: {
    bgColor: "bg-[#E45858]",
    label: "Reprovado",
  },
  PENDENTE: {
    bgColor: "bg-[#FFC05B]",
    label: "Pendente",
  },
};

export default function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`px-3 py-1 text-sm font-medium rounded-sm text-white ${config.bgColor}`}
    >
      {config.label}
    </span>
  );
}
