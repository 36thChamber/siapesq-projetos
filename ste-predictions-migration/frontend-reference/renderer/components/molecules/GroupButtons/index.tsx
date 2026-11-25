import React from "react";
import CardInfo from "../../atoms/cardInfo";

export type GrupoEspecieFront = {
  id_gruposespecies: string;
  nome: string;
  quantidade: number;
  icon: string;
  disabled?: boolean;
};

type GroupButtonsProps = {
  grupos: GrupoEspecieFront[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function GroupButtons({
  grupos,
  selectedId,
  onSelect,
}: GroupButtonsProps) {
  if (!grupos || grupos.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-bold text-[#287e7e] mb-4">
          Grupos de espécies
        </h2>
        <p className="text-gray-400 text-sm italic">Carregando grupos...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-[#287e7e] mb-4">
        Grupos de espécies
      </h2>

      <div className="flex flex-wrap gap-4">
        {grupos.map((grupo) => {
          const isSelected = selectedId === grupo.id_gruposespecies;
          const isDisabled = grupo.disabled;

          return (
            <div
              key={grupo.id_gruposespecies}
              onClick={() => !isDisabled && onSelect(grupo.id_gruposespecies)}
              className={`
          w-48 h-20
          transition-transform
          ${
            isDisabled
              ? "opacity-40 cursor-not-allowed grayscale"
              : "cursor-pointer hover:scale-105"
          }
        `}
            >
              <CardInfo
                icon_top={grupo.icon}
                text={grupo.nome}
                style={`
            w-full h-full
            flex flex-col items-center justify-center
            rounded-lg
            ${
              isSelected
                ? "bg-[#287e7e] text-white"
                : "bg-[#287e7e]/50 text-white"
            }
            shadow-sm
          `}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GroupButtons;
