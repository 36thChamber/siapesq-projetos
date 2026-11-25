import { useState, ChangeEvent, KeyboardEvent } from "react";
import Image from "next/image";

type InputDynamicProps = {
  label?: string;
  placeholder?: string;
  frontIcon?: string;
  iconPasswordOpen?: string;
  iconPasswordClosed?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  value?: string;
  name?: string;
  width?: string;
  type?: string;
  required?: boolean; // Adicionei para ajudar na validação nativa
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
  required = false,
}: InputDynamicProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const currentIcon = isPassword
    ? showPassword
      ? iconPasswordOpen
      : iconPasswordClosed
    : undefined;

  return (
    <div className={width}>
      {label && (
        <label className="block mb-1 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="relative">
        {frontIcon && (
          <Image
            src={frontIcon}
            alt="icon"
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}

        <input
          name={name}
          value={value}
          type={inputType}
          placeholder={placeholder}
          onChange={onChange}
          onKeyDown={onKeyDown}
          required={required}
          className="
            w-full
            px-4 py-2
            pl-10
            pr-10
            border
            rounded-lg
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            border-gray-300
          "
        />

        {isPassword && currentIcon && (
          <Image
            src={currentIcon}
            alt="toggle password"
            width={20}
            height={20}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none text-gray-400"
            onClick={() => setShowPassword((v) => !v)}
          />
        )}
      </div>
    </div>
  );
}