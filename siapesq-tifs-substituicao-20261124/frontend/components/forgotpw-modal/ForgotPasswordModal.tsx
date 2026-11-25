import { forgotPassword } from "@/services/api/usuarios.service";
import { useState } from "react";

type Props = {
  setModalPwd: (v: boolean) => void;
};

function useForgotPwd() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email) {
      setError("E-mail inválido.");
      return;
    }
    setLoading(true);

    // try {
    //   // const result = await forgotPwd(email);
    //   const result = await forgotPassword(email);
    //   if (result) setRes(result.data.message as string);
    // } catch (e) {
    //   setError((e as string) || "Não foi possível enviar o email");
    // } finally {
    //   setLoading(false);
    // }

    try {
      // ✅ Passa um objeto { email } no lugar da string
      await forgotPassword({ email });
      
      // ✅ Se chegou aqui, deu certo
      setRes("Email de recuperação enviado com sucesso! Verifique sua caixa de entrada.");
    } catch (error: any) {
      // ✅ Extrai a mensagem de erro da resposta da API, se disponível
      const mensagem = error.response?.data?.message || "Não foi possível enviar o email.";
      setError(mensagem);
    } finally {
      setLoading(false);
    }
  };

  return { email, setEmail, error, res, loading, handleSubmit };
}

export default function ForgotpwdModal({ setModalPwd }: Props) {
  const forgot = useForgotPwd();

  return (
    <div
      className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center"
      onClick={() => setModalPwd(false)}
    >
      <div
        className="bg-white rounded-lg shadow-[0px_10px_12.5px_rgba(0,0,0,0.2)] w-[480px] max-w-[90vw] pt-8 pb-12 px-8 flex flex-col gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-start">
          <h2 className="text-[#213363] text-[24px] font-bold leading-[32px]">
            Esqueceu a senha ?
          </h2>
          <div className="h-[3px] w-[58px] bg-[#213363] mt-1 rounded-full" />
        </div>

        <p className="text-[#6b7280] text-[14px] leading-[20px]">
          Digite seu email para recuperar senha
        </p>

        <div className="flex flex-col sm:flex-row items-stretch pt-4 gap-2 sm:gap-0">
          <input
            type="email"
            placeholder="E-mail"
            value={forgot.email}
            onChange={(e) => forgot.setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && forgot.handleSubmit()}
            className="flex-1 border border-[#d1d5db] rounded-[6px] sm:rounded-l-[6px] sm:rounded-r-none px-4 py-3 text-[14px] text-[#1e293b] placeholder:text-[#6b7280] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#213363]"
          />
          <button
            type="button"
            onClick={forgot.handleSubmit}
            disabled={forgot.loading}
            className="bg-[#213363] border border-[#213363] text-white text-[14px] px-8 py-3 rounded-[6px] sm:rounded-l-none sm:rounded-r-[6px] shadow-[0px_4px_2px_rgba(0,0,0,0.25)] hover:bg-[#1a2a52] transition-colors disabled:opacity-60"
          >
            {forgot.loading ? "Enviando..." : "Enviar"}
          </button>
        </div>

        {forgot.res && (
          <p className="text-green-600 text-sm mt-2" role="alert">
            {forgot.res}
          </p>
        )}
        {forgot.error && (
          <p className="text-red-500 text-sm mt-2" role="alert">
            {forgot.error}
          </p>
        )}
      </div>
    </div>
  );
}
