import { useState } from "react";
import { register_usuario } from "../../controllers/usuarios-controllers";
import RegisterForm from "../molecules/registerForm";
import {
  FormDataType,
  TipoUsuario,
  type_register,
} from "../../controllers/types/usuario-types";
import { maskContato, maskCPF } from "../../utils/maskRegister";
import Image from "next/image";
import SuccessRegisterModal from "../atoms/modalSuccessRegister";
import { useRouter } from "next/router";

export default function FormRegister() {
  const [formData, setFormData] = useState<FormDataType>({
    nome: "",
    cpf: "",
    email: "",
    senha: "",
    confirm_senha: "",
    contato: "",
    titulo_cientifico: false,
    tipo_usuario: TipoUsuario.PESQUISADOR,
  });

  const [errors, setErrors] = useState({
    nome: "",
    cpf: "",
    email: "",
    senha: "",
    confirm_senha: "",
    contato: "",
    server: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [registerResult, setRegisterResult] = useState<null | {
    nome: string;
    email: string;
    email_verification_sent: boolean;
  }>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "cpf") newValue = maskCPF(value);
    if (name === "contato") newValue = maskContato(value);

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErrors((prev) => ({ ...prev, server: "" }));

    if (formData.senha !== formData.confirm_senha) {
      setErrors((prev) => ({
        ...prev,
        confirm_senha: "As senhas não coincidem",
      }));
      return;
    }

    const data: type_register = {
      nome: formData.nome,
      email: formData.email,
      senha: formData.senha,
      contato: formData.contato,
      cpf: formData.cpf,
      titulo_cientifico: formData.titulo_cientifico,
      tipo_usuario: formData.tipo_usuario,
    };

    try {
      const response = await register_usuario(data);

      if (!response || !response.nome || !response.email) {
        setErrors((prev) => ({
          ...prev,
          server: "Resposta inválida do servidor ao cadastrar.",
        }));
        return;
      }

      setRegisterResult({
        nome: response.nome,
        email: response.email,
        email_verification_sent: !!response.email_verification_sent,
      });

      setShowModal(true);
      // limpar form...
    } catch (error: any) {
      console.log(error);
      setErrors((prev) => ({
        ...prev,
        server:
          error?.response?.data?.error ??
          error?.response?.data?.message ??
          error.message ??
          "Erro ao cadastrar usuário.",
      }));
    }
  }
  const router = useRouter();

  return (
    <div className="flex w-full min-h-screen">
      {/* Lateral esquerda */}
      <div className="hidden lg:block lg:w-1/3 bg-dark_green" />

      {/* Conteúdo principal */}
      <div className="w-full lg:w-2/3 relative bg-[#D6F5F1] flex flex-col justify-center items-center py-8">
        <RegisterForm
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
        />

        <div className="absolute bottom-2 right-2 flex items-center gap-3 scale-75">
          <Image
            src="/images/logos/hubittat.svg"
            alt="Hubittat Logo"
            width={120}
            height={40}
            className="hidden md:block"
          />
          <Image
            src="/images/logos/ste.svg"
            alt="STE Logo"
            width={120}
            height={40}
            className="hidden md:block"
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && registerResult && (
        <SuccessRegisterModal
          nome={registerResult.nome}
          email={registerResult.email}
          emailSent={registerResult.email_verification_sent}
          close={() => {
            setShowModal(false);
            router.push("/login")
          }}
        />
      )}
    </div>
  );
}
