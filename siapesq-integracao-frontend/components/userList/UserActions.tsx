import { User } from "@/utils/users";
import AdminUserActionsDropdown from "../userActionDropdown";
import { DownloadIcon } from "@/components/icons";

interface UserActionsProps {
  user: User;
  onReview?: () => void;
}

export default function UserActions({ user, onReview }: UserActionsProps) {
  return (
    <div className="flex items-center gap-2 relative">
      <button
        className="
          flex items-center gap-2
          px-3 py-1
          rounded-md
          hover:bg-blue-100
          text-blue-600
          transition-colors
        "
        title="Ver Documento"
        onClick={onReview}
      >
        <DownloadIcon size={15} />
        <span className="text-sm font-medium">Documento</span>
      </button>

      {user.status === "PENDENTE" && (
        <AdminUserActionsDropdown user={user} />
      )}
    </div>
  );
}
