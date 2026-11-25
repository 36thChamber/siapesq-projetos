import React from "react";

export type ButtonVariant = "dark" | "light" | "select";

export interface ButtonDynamicProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /**
   * Ícone vindo como URL de imagem
   * ex: iconSrc="/icons/add.svg"
   */
  iconSrc?: string; // agora é obrigatório usar img, opcional
  text: string; // texto agora é obrigatório
  fullWidth?: boolean;
  active?: boolean;
}

export const ButtonDynamic: React.FC<ButtonDynamicProps> = ({
  variant = "dark",
  iconSrc,
  text,
  disabled = false,
  fullWidth = false,
  active = false,
  className = "",
  type = "button",
  onClick,
  ...rest
}) => {
  const base = `
    flex items-center gap-2
    rounded-md font-medium transition-all
    px-4 py-2
  `;

  const width = fullWidth ? "w-full" : "w-auto";

  const variantClasses =
    variant === "dark"
      ? "btn-dark-green"
      : variant === "light"
      ? "btn-light-green border border-[var(--color-dark_green)]"
      : active
      ? "bg-[var(--color-dark_green)] text-[var(--color-light_green)]"
      : "bg-[#89bdbb] text-green_light/70 hover:opacity-80";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${width} ${variantClasses} ${className}`}
      {...rest}
    >
      {iconSrc && (
        <img src={iconSrc} alt="icon" className="w-4 h-4 object-contain" />
      )}

      <span>{text}</span>
    </button>
  );
};
