// src/components/molecules/FormLogin/index.tsx
import Image from "next/image";
import Link from "next/link";
import InputDynamic from "../../atoms/inputDynamic";
import { ButtonDynamic } from "../../atoms/buttonDynamic/buttonDynamic";

type FormLoginProps = {
  email: string;
  senha: string;
  onChangeEmail: (value: string) => void;
  onChangeSenha: (value: string) => void;
  onSubmit?: () => void;
  onGoToRegister?: () => void;
  onForgotPassword?: () => void;
  errorMessage?: string;
};

export default function FormLogin({
  email,
  senha,
  onChangeEmail,
  onChangeSenha,
  onSubmit,
  onGoToRegister,
  onForgotPassword,
  errorMessage,
}: FormLoginProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  return (
    <div className="form-container">
      <div className="logo-container">
        <Image
          src={"/images/logos/SIAPESQ3.svg"}
          alt="Logo da siapesq"
          fill
          sizes={"100%"}
        />
      </div>

      <form method="POST" className="form-login" onSubmit={handleSubmit}>
        {errorMessage && (
          <div
            className="error-message"
            style={{
              color: "#dc2626", // vermelho
              fontSize: "0.875rem",
              marginBottom: "12px",
            }}
          >
            {errorMessage}
          </div>
        )}
        <InputDynamic
          frontIcon="/images/icons/mail.svg"
          label="E-mail"
          placeholder="E-mail"
          name="ipt_email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChangeEmail(e.currentTarget.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") onSubmit();
          }}
        />

        <InputDynamic
          frontIcon="/images/icons/padlock.svg"
          label="Senha"
          placeholder="Senha"
          name="ipt_senha"
          value={senha}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChangeSenha(e.currentTarget.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") onSubmit();
          }}
          type="password"
          iconPasswordClosed="/images/icons/eyesPadlock.svg"
          iconPasswordOpen="/images/icons/eyesOpen.svg"
        />

        <div className="forget-password">
          <button
            type="button"
            className="text-sm underline"
            onClick={onForgotPassword}
          >
            Esqueceu a senha?
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <ButtonDynamic
            text={"Entrar"}
            className="btn-bg_green_dark"
            type="submit"
          />
          <ButtonDynamic
            text={"Cadastrar"}
            className="btn-bg_green_light"
            type="button"
            onClick={onGoToRegister}
          />
        </div>
      </form>
    </div>
  );
}
