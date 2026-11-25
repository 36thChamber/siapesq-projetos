import { useRouter } from "next/router";
import { FormDataType } from "../../../controllers/types/usuario-types";
import InputDynamic from "../../atoms/inputDynamic";
import Image from "next/image";

type RegisterFormProps = {
  formData: FormDataType;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  errors: any;
};

export default function RegisterForm({
  formData,
  handleChange,
  handleSubmit,
  errors,
}: RegisterFormProps) {
  const router = useRouter();

  return (
    <div className="w-full max-w-[520px] mx-auto flex flex-col items-center px-4">

      <div className="relative w-28 h-28 md:w-32 md:h-32 flex justify-center items-center">
        <Image
          src="/images/logos/SIAPESQ3.svg"
          alt="Logo da siapesq"
          fill
          className="object-contain"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full bg-[#D6F5F1] px-4 py-3 rounded-lg flex flex-col gap-3"
      >
        <InputDynamic
          label="Nome"
          placeholder="Nome"
          name="nome"
          frontIcon="/images/icons/person.svg"
          onChange={handleChange}
          value={formData.nome}
        />
        {errors.nome && <span className="text-red-500 text-sm">{errors.nome}</span>}

        <InputDynamic
          label="CPF"
          placeholder="CPF"
          name="cpf"
          frontIcon="/images/icons/file.svg"
          value={formData.cpf}
          onChange={handleChange}
        />
        {errors.cpf && <span className="text-red-500 text-sm">{errors.cpf}</span>}

        <InputDynamic
          label="E-mail"
          placeholder="E-mail"
          name="email"
          type="email"
          frontIcon="/images/icons/mail.svg"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}

        <InputDynamic
          label="Senha"
          placeholder="Senha"
          name="senha"
          type="password"
          frontIcon="/images/icons/padlock.svg"
          iconPasswordClosed="/images/icons/eyesPadlock.svg"
          iconPasswordOpen="/images/icons/eyesOpen.svg"
          value={formData.senha}
          onChange={handleChange}
        />
        {errors.senha && <span className="text-red-500 text-sm">{errors.senha}</span>}

        <InputDynamic
          label="Confirmar senha"
          placeholder="Confirmar senha"
          name="confirm_senha"
          type="password"
          frontIcon="/images/icons/padlock.svg"
          iconPasswordClosed="/images/icons/eyesPadlock.svg"
          iconPasswordOpen="/images/icons/eyesOpen.svg"
          value={formData.confirm_senha}
          onChange={handleChange}
        />
        {errors.confirm_senha && <span className="text-red-500 text-sm">{errors.confirm_senha}</span>}

        <InputDynamic
          label="Contato"
          placeholder="Contato"
          name="contato"
          frontIcon="/images/icons/contact.svg"
          value={formData.contato}
          onChange={handleChange}
        />
        {errors.contato && <span className="text-red-500 text-sm">{errors.contato}</span>}

        <button className="w-full py-2 bg-white border border-primary rounded-md text-primary mt-2 cursor-pointer">
          Cadastrar
        </button>

        {errors.server && <span className="text-red-500 text-sm">{errors.server}</span>}

        <a
          className="text-lg text-primary underline cursor-pointer"
          onClick={() => router.push("/login")}
        >
          Já possui cadastro?
        </a>
      </form>
    </div>
  );
}