"use client";

import { useRouter } from "next/router";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  type_login,
  type_login_response,
} from "../controllers/types/usuario-types";

import {
  login_usuario,
  logout_usuario,
  refresh_token,
} from "../controllers/usuarios-controllers";

/* ===========================
   TYPES
=========================== */
type PendingVerification = {
  email: string;
  nome: string;
  id_usuario: string;
};


type AuthContextType = {
  user: Omit<type_login_response, "token"> | null;
  login: (email: string, senha: string) => Promise<string>;
  logout: () => void;
  setUser: (user: Omit<type_login_response, "token"> | null) => void;
  loading: boolean;
  pendingVerification: PendingVerification | null;
  setPendingVerification: (data: PendingVerification | null) => void;
};

const PUBLIC_ROUTES = ["/", "/login", "/register"];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ===========================
   PROVIDER
=========================== */
export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const [user, setUser] = useState<Omit<type_login_response, "token"> | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);

  const router = useRouter();

  /* ===========================
     VALIDATE TOKEN ON LOAD
  =========================== */
  useEffect(() => {

    const validate = async () => {
      try {
        const token = await window.auth.getToken();

        const storedUser = await window.auth.getUserData();


        if (!token || !storedUser) {

          await window.auth.clearUserData();
          setUser(null);
          setLoading(false);
          return;
        }

        const refreshed = await refresh_token(token);

        await window.auth.setToken(refreshed.token);

        const { token: _t, ...cleanUser } = refreshed;

        await window.auth.setUserData(cleanUser);

        setUser(cleanUser);
      } catch (err) {
        await window.auth.clearToken();
        await window.auth.clearUserData();

        setUser(null);
      }

      setLoading(false);
    };

    validate();
  }, []);

  /* ===========================
     LOGIN
  =========================== */
  const login = async (email: string, senha: string): Promise<string> => {
   
    try {
      const body: type_login = { email, senha };

      const result = await login_usuario(body);

      // EMAIL NÃO VERIFICADO
      if (!result.email_verificado) {
        
        const { token, ...cleanUser } = result;

        await window.auth.clearToken();
        await window.auth.clearUserData();

        setPendingVerification({
          email: cleanUser.email,
          nome: cleanUser.nome,
          id_usuario: cleanUser.id_usuario,
        });

        return "E-mail pendente de verificação";
      }

      // FLUXO NORMAL

      await window.auth.setToken(result.token);

      const { token, ...cleanUser } = result;

      await window.auth.setUserData(cleanUser);
      setUser(cleanUser);

      router.replace("/loadingPage");

      return "Login realizado com sucesso";
    } catch (error: any) {

      if (error?.response?.status === 401) {
        return "Erro nas credenciais";
      }

      return "Erro ao realizar login";
    }
  };

  /* ===========================
     LOGOUT
  =========================== */
  const logout = async () => {

    try {
      await logout_usuario();
    } catch (err) {
      return;
    }

    await window.auth.clearToken();
    await window.auth.clearUserData();

    setUser(null);
    setPendingVerification(null);

    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        setUser,
        loading,
        pendingVerification,
        setPendingVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ===========================
   HOOK
=========================== */
export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth deve estar dentro de AuthProvider");
  }

  return ctx;
};
