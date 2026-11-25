import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const INVALID_CREDENTIALS_MSG = "Usuário não encontrado ou credenciais incorretas.";

function getStatusCode(err: unknown): number | undefined {
  const anyErr = err as any;

  if (anyErr?.response?.status) return anyErr.response.status; // axios
  if (typeof Response !== "undefined" && err instanceof Response) return err.status; // fetch Response
  if (typeof anyErr?.status === "number") return anyErr.status; // custom

  const msg = String(anyErr?.message ?? "");
  const match = msg.match(/\b(400|401|403|404|409|422|500|502|503)\b/);
  return match ? Number(match[1]) : undefined;
}

function mapLoginError(err: unknown): string {
  const status = getStatusCode(err);

  if (status === 400 || status === 401 || status === 404) return INVALID_CREDENTIALS_MSG;
  if (status === 422) return "Dados inválidos. Verifique email e senha.";
  if (status === 403) return "Acesso negado. Verifique suas permissões.";
  if (status && status >= 500) return "Erro no servidor. Tente novamente em instantes.";

  return "Não foi possível entrar. Verifique os dados e tente novamente.";
}

export function useLogin() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result === true) {
        router.push("/home");
        return;
      }

      if (typeof result === "string" && result.trim()) {
        const maybeStatus = getStatusCode({ message: result });
        setError(maybeStatus === 400 || maybeStatus === 401 || maybeStatus === 404 ? INVALID_CREDENTIALS_MSG : result);
        return;
      }

      setError(INVALID_CREDENTIALS_MSG);
    } catch (err) {
      setError(mapLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return { email, password, rememberMe, loading, error, setEmail, setPassword, setRememberMe, handleSubmit };
}