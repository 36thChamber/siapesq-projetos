import { User } from "@/utils/users";
import UserRow from "./UserRow";

interface UsersTableProps {
  users: User[];
}

export default function UsersTable({ users }: UsersTableProps) {
  return (
    <div className="h-full overflow-auto border rounded-sm" style={{ position: 'relative' }}>
      <table className="w-full text-left border-collapse">
        <thead className="bg-[rgba(39,132,190,0.42)] sticky top-0 z-10">
          <tr>
            <th className="p-3 text-[#233263] font-bold">Nome</th>
            <th className="p-3 text-[#233263] font-bold">E-mail</th>
            <th className="p-3 text-[#233263] font-bold">Contato</th>
            <th className="p-3 text-[#233263] font-bold">Tipo</th>
            <th className="p-3 text-[#233263] font-bold">Status</th>
            <th className="p-3 text-[#233263] font-bold">Ações</th>
          </tr>
        </thead>
        <tbody style={{ position: 'relative' }}>
          {users.length > 0 ? (
            users.map((user) => <UserRow key={user.id} user={user} />)
          ) : (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-500">
                Nenhum usuário encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
