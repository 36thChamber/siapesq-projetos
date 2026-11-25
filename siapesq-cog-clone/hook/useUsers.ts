import { useAuth } from "@/context/AuthContext";
import { getAllUsers, searchUsers } from "@/services/api/usuarios.service";
import { mapUserFromApi } from "@/utils/userMapper";
import { User } from "@/utils/users";
import { useEffect, useState } from "react";

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  handleSearch: (query: string) => Promise<void>;
  filteredUsers: User[];
}

export function useUsers(): UseUsersReturn {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Busca inicial de todos os usuários
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllUsers();

        // Tratamento robusto de diferentes formatos de resposta
        let usuariosArray = [];

        if (Array.isArray(data)) {
          // Caso 1: Array direto
          usuariosArray = data;
        } else if (data && Array.isArray(data.results)) {
          // Caso 2: { results: [...] } - FORMATO CORRETO DA SUA API
          usuariosArray = data.results;

        } else if (data && Array.isArray(data.usuarios)) {
          // Caso 3: { usuarios: [...] }
          usuariosArray = data.usuarios;
        } else if (data && Array.isArray(data.data)) {
          // Caso 4: { data: [...] }
          usuariosArray = data.data;
        } else {
          console.error("Formato de resposta de usuários inválido.");
          setError("Formato de resposta inválido");
          setUsers([]);
          return;
        }

        const formattedUsers = usuariosArray.map(mapUserFromApi);
        setUsers(formattedUsers);
      } catch (err) {
        console.error("Não foi possível consultar os usuários.");
        setError("Falha ao carregar usuários");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    let active=true;queueMicrotask(()=>{if(active)void fetchUsers();});
    return ()=>{active=false;};
  }, [user]);

  // Handler para busca
  const handleSearch = async (query: string) => {
    if (!user) return;

    // Se a busca estiver vazia, recarrega todos
    if (!query.trim()) {
      try {
        setError(null);
        const data = await getAllUsers();

        let usuariosArray = [];
        if (Array.isArray(data)) {
          usuariosArray = data;
        } else if (data && Array.isArray(data.results)) {
          usuariosArray = data.results;
        } else if (data && Array.isArray(data.usuarios)) {
          usuariosArray = data.usuarios;
        } else if (data && Array.isArray(data.data)) {
          usuariosArray = data.data;
        }

        const formattedUsers = usuariosArray.map(mapUserFromApi);
        setUsers(formattedUsers);
      } catch (err) {
        console.error("Não foi possível consultar os usuários.");
        setError("Falha ao recarregar");
      }
      return;
    }

    try {
      setError(null);
      const data = await searchUsers(query);

      let usuariosArray = [];

      if (Array.isArray(data)) {
        usuariosArray = data;
      } else if (data && Array.isArray(data.results)) {
        // FORMATO CORRETO DA SUA API
        usuariosArray = data.results;
      } else if (data && Array.isArray(data.usuarios)) {
        usuariosArray = data.usuarios;
      } else if (data && Array.isArray(data.data)) {
        usuariosArray = data.data;
      } else {
        console.warn("⚠️ Busca sem resultados ou formato inválido");
        setUsers([]); // Nenhum resultado encontrado
        return;
      }

      const formattedUsers = usuariosArray.map(mapUserFromApi);
      setUsers(formattedUsers);
    } catch (err) {
      console.error("Não foi possível consultar os usuários.");
      setError("Falha na busca");
      setUsers([]);
    }
  };

  // Filtro local para busca em tempo real
  const filteredUsers = search.trim()
    ? users.filter(
        (u) =>
          u.nome.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return {
    users,
    loading: Boolean(user) && loading,
    error,
    search,
    setSearch,
    handleSearch,
    filteredUsers,
  };
}
