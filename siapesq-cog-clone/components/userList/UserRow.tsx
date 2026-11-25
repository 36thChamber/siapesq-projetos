import { useState } from "react";
import { type User } from "@/utils/users";
import UserStatusBadge from "./UserStatusBadge";
import UserActions from "./UserActions";
import ScientificCertificate from "@/components/auth/ScientificCertificate";

interface UserRowProps {
  user: User;
}

export default function UserRow({ user }: UserRowProps) {
  const [reviewOpen,setReviewOpen]=useState(false);
  return (
    <tr className="border-t hover:bg-gray-50 transition-colors">
      <td className="p-3 text-[#233263]">{user.nome}</td>
      <td className="p-3 text-[#233263]">{user.email}</td>
      <td className="p-3 text-[#233263]">{user.contato}</td>
      <td className="p-3 text-[#233263]">{user.tipo}</td>
      <td className="p-3">
        <UserStatusBadge status={user.status} />
      </td>
      <td className="p-3 relative">
        <UserActions user={user} onReview={()=>setReviewOpen(open=>!open)} />
        {reviewOpen && <ScientificCertificate userId={String(user.id)} readOnly />}
      </td>
    </tr>
  );
}
