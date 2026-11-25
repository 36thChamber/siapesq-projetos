// src/components/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import FormLogin from "../molecules/formLogin";
import ForgotPasswordModal from "../atoms/ForgotPasswordModal";
import VerifyEmailModal from "../atoms/modalVerifyEmail";
import ModalLoading from "../atoms/modalLoading";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  const { user, login, pendingVerification, setPendingVerification } = useAuth();

  const router = useRouter();

  const handleLogin = async () => {
    const regex = new RegExp(
      "^[a-z0-9.]+@[a-z0-9]+\\.[a-z]+(\\.[a-z]+)?$",
      "i"
    );

    if (!email || !regex.test(email)) {
      console.log("E-mail inválido");
      setError("E-mail inválido");
      return;
    }

    if (!senha) {
      console.log("Senha inválida");
      setError("Senha inválida");
      return;
    }

    const result = await login(email, senha);

    if (result === "Erro ao realizar login") {
      setError(result);
    }
    if (result === "Erro nas credenciais") {
      setError(result);
    }
    if (result === "E-mail pendente de verificação") {
      setIsVerifyOpen(true);
      setError("Sua conta precisa ser verificada. Verifique seu e-mail.");
    }

    return;
  };

  useEffect(() => {
    if (pendingVerification) {
      setIsVerifyOpen(true);
    }
  }, [pendingVerification]);

  const goToRegister = () => {
    router.push("/register");
  };

  const goToForgotPassword = () => {
    setIsForgotOpen(true);
  };

  const handleCloseForgot = () => {
    setIsForgotOpen(false);
  };

  const handleCloseVerify = () => {
    setIsVerifyOpen(false);
    setPendingVerification(null);
  };

  return (
    <>
      <FormLogin
        email={email}
        senha={senha}
        onChangeEmail={setEmail}
        onChangeSenha={setSenha}
        onSubmit={handleLogin}
        onGoToRegister={goToRegister}
        onForgotPassword={goToForgotPassword}
        errorMessage={error}
      />

      <ForgotPasswordModal isOpen={isForgotOpen} onClose={handleCloseForgot} />

      {pendingVerification && (
        <VerifyEmailModal
          isOpen={isVerifyOpen}
          email={pendingVerification.email}
          nome={pendingVerification.nome}
          onClose={handleCloseVerify}
          {...(user && { id_usuario: user.id_usuario })}
        />
      )}
    </>
  );
}
