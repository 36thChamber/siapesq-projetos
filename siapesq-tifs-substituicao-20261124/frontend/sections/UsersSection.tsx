import { SearchBar } from "@/components/searchBar";
import UsersTable from "@/components/userList/UsersTable";
import { useUsers } from "@/hook/useUsers";
import { useAuth } from "@/context/AuthContext";

// 1. O Componente principal apenas checa a permissão
export default function UsersSection() {
  const { user } = useAuth();

  if (!user || user.tipo_usuario !== "ADMIN") {
    return <div className="p-6 text-center text-red-500">Acesso negado.</div>;
  }

  return <UsersSectionContent />;
}

function UsersSectionContent() {
  const { 
    filteredUsers, 
    loading, 
    error, 
    search, 
    setSearch, 
    handleSearch 
  } = useUsers(); 

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow-md">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        Lista de Usuários
      </h1>

      <div className="mb-4 flex-shrink-0">
        <SearchBar
          placeholder="Pesquisar usuário..."
          value={search}
          onChange={setSearch}
        />
      </div>

      {loading && (
        <div className="p-6 text-center text-gray-500">
          Carregando usuários...
        </div>
      )}

      {error && (
        <div className="p-6 text-center text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 min-h-0">
          <UsersTable users={filteredUsers} />
        </div>
      )}
    </div>
  );
}