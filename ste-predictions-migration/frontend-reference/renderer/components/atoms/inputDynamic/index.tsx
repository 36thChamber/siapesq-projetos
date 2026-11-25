import { useState } from "react";
import Image from "next/image";

type InputDynamicProps = {
  label?: string;
  placeholder?: string;
  frontIcon: string;
  iconPasswordOpen?: string; // novo ícone quando senha está visível
  iconPasswordClosed?: string; // novo ícone quando senha está oculta
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  value?: string;
  name?: string;
  width?: string;
  type?: string; // password / text / email...
};

export default function InputDynamic({
  label,
  placeholder,
  frontIcon,
  iconPasswordOpen,
  iconPasswordClosed,
  onChange,
  onKeyDown,
  value,
  name,
  width = "w-full",
  type = "text",
}: InputDynamicProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  // Decide qual ícone usar
  const currentIcon = isPassword
    ? showPassword
      ? iconPasswordOpen
      : iconPasswordClosed
    : undefined;

  return (
    <div className={`${width}`}>
      {label && <label className="input-label">{label}</label>}

      <div className="input-wrapper relative">
        <Image
          src={frontIcon}
          alt="front icon"
          width={10}
          height={10}
          className="input-icon-start w-5 h-5"
        />

        <input
          name={name}
          value={value}
          type={inputType}
          placeholder={placeholder}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="input-base"
        />

        {isPassword && currentIcon && (
          <Image
            src={currentIcon}
            alt="toggle password"
            width={10}
            height={10}
            className="input-icon-end w-5 h-5 cursor-pointer select-none"
            onClick={() => setShowPassword((v) => !v)}
          />
        )}
      </div>
    </div>
  );
}
