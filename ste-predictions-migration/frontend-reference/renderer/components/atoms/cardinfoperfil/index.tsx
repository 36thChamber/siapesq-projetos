import React from "react";

interface CardInfoPerfilProps {
  label: string;
  value: string;
  isEditing: boolean;
  onChange?: (value: string) => void;
}

export default function CardInfoPerfil({
  label,
  value,
  isEditing,
  onChange,
}: CardInfoPerfilProps) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-4 py-2">
      <label className="text-light_green font-medium">{label}:</label>

      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="
            bg-dark_green
            border border-teal-400 
            rounded px-2 py-1 
            text-light_green
            shadow-md 
            focus:outline-none 
            focus:border-white
            transition-all
            w-full
            max-w-[280px]
          "
        />
      ) : (
        <span className="text-light_greenw-full max-w-[280px]">{value}</span>
      )}
    </div>
  );
}
