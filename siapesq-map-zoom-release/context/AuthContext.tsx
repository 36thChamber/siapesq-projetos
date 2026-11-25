"use client";

import { Usuario } from "@/services/types/usuario.types";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  createContext,
  Dispatch,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  refreshToken,
  logoutAccount,
  loginUsuario,
} from "@/services/api/usuarios.service";
import { SESSION_EXPIRED_EVENT } from "@/services/api/apiClient";
import {
  AccessAction,
  AccessControl,
  accessReducer,
  GetPlanoResponse,
} from "@/services/types/plano.types";
import { getAssinaturasUsuario } from "@/services/api/assinaturas.service";
import {
  DEFAULT_STATE,
  usePlatformTheme,
} from "@/context/PlatformThemeContext";

type AuthContextType = {
  plano?: GetPlanoResponse | null;
  user: Usuario | null;
  accessControl: AccessControl;
  accessDispatch: Dispatch<AccessAction>;
  login: (email: string, senha: string) => Promise<true | string>;
  logout: () => Promise<boolean>;
  setUser: (user: Usuario | null) => void;
  loading: boolean;
  sessionStatus: SessionStatus;
  sessionError: string | null;
  retrySession: () => Promise<void>;
  logoutPending: boolean;
  logoutError: string | null;
};

export type SessionStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unavailable";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LEGACY_STORAGE_KEYS = ["Usuario", "userData", "token", "user"];

function cleanLegacyStorage(): void {
  if (typeof window === "undefined") return;
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("Usuario");
    sessionStorage.removeItem("userData");
  } catch {
    // Ignora restrições de sandbox de storage
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("loading");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [plano, setPlano] = useState<GetPlanoResponse | null>();
  const router = useRouter();
  const { setSelectedState } = usePlatformTheme();
  // Impede que configPlano rode antes da restauração da sessão completar
  const isRefreshing = useRef(true);

  useEffect(() => {
    const configPlano = async () => {
      if (!user || isRefreshing.current) return;

      try {
        const assinatura = await getAssinaturasUsuario(user.id_usuario);
        setPlano(assinatura?.plano ?? null);
      } catch (error: any) {
        // A consulta pode falhar; o plano permanece indisponível neste contexto.
        setPlano(null);
      }
    };
    configPlano();
  }, [user]);

  const [accessControl, accessDispatch] = useReducer(accessReducer, {
    Species: { views: 0, viewedIds: [] },
    Categories: { views: 0, viewedIds: [] },
  });

  const logout = useCallback(async (): Promise<boolean> => {
    setLogoutPending(true);
    setLogoutError(null);

    try {
      await logoutAccount();
      cleanLegacyStorage();
      setUser(null);
      setSessionStatus("unauthenticated");
      setSessionError(null);
      accessDispatch({ type: "resetSpecies", id: "" });
      accessDispatch({ type: "resetCategories", id: "" });
      router.push("/login");
      return true;
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setLogoutError(
        message ||
          "Não foi possível encerrar a sessão. Tente novamente.",
      );
      return false;
    } finally {
      setLogoutPending(false);
    }
  }, [router]);

  const retrySession = useCallback(async () => {
    cleanLegacyStorage();
    setLoading(true);
    setSessionStatus("loading");
    setSessionError(null);
    isRefreshing.current = true;

    try {
      const restoredUser: Usuario = await refreshToken();

      isRefreshing.current = false;
      setUser(restoredUser);
      setSessionStatus("authenticated");
    } catch (error: unknown) {
      isRefreshing.current = false;

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setUser(null);
        setSessionStatus("unauthenticated");
        return;
      }

      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setSessionStatus("unavailable");
      setSessionError(
        message ||
          "Não foi possível verificar sua sessão. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void retrySession();
  }, [retrySession]);

  const login = async (
    email: string,
    senha: string,
  ): Promise<true | string> => {
    if (!email || !senha) return "Preencha todos os campos.";

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(email)) return "Digite um e-mail válido.";

    try {
      // O BFF autentica no upstream, define o cookie HttpOnly e retorna o perfil sem credenciais expostas
      const loggedUser: Usuario = await loginUsuario({ email, senha });

      cleanLegacyStorage();
      setUser(loggedUser);
      setSessionStatus("authenticated");
      setSessionError(null);
      setLogoutError(null);

      // TODO: quando o backend expuser o estado do usuário, usar esse valor aqui no lugar do padrão.
      setSelectedState(DEFAULT_STATE);

      router.push("/home");
      return true;
    } catch (error: any) {
      const mensagem =
        error.response?.data?.message || "Erro ao realizar login.";
      return mensagem;
    }
  };

  // Sessão expirou durante o uso em uma chamada de API. O apiClient dispara esse evento
  // centralizado em qualquer 401 autenticado.
  useEffect(() => {
    const handleSessionExpired = () => {
      void logout();
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        login,
        setUser,
        loading,
        sessionStatus,
        sessionError,
        retrySession,
        logoutPending,
        logoutError,
        plano,
        accessControl,
        accessDispatch,
      }}
    >
      {sessionStatus === "unavailable" && (
        <div
          role="alert"
          className="flex items-center justify-center gap-3 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span>{sessionError}</span>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => void retrySession()}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro de AuthProvider");
  return ctx;
};
