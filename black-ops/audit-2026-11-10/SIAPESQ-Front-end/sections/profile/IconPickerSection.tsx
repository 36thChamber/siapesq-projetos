"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

const ANIMAL_ICONS = [
  { id: 1, src: "/profiles/icon_arara.svg", alt: "Arara" },
  { id: 2, src: "/profiles/icon_capivara.svg", alt: "Capivara" },
  { id: 3, src: "/profiles/icon_lobo.svg", alt: "Lobo" },
  { id: 4, src: "/profiles/icon_mico.svg", alt: "Mico" },
  { id: 5, src: "/profiles/icon_onca.svg", alt: "Onça" },
  { id: 6, src: "/profiles/icon_tamandua.svg", alt: "Tamanduá" },
  { id: 7, src: "/profiles/icon_tucano.svg", alt: "Tucano" },
];

export default function IconPickerSection() {
  const { theme } = usePlatformTheme();
  const [selectedIconId, setSelectedIconId] = useState<number | null>(null);
  const c = theme.colors as any;
  const titleColor = c.titleColor ?? c.text;
  const accent = c.brandBlue ?? c.primary[500];

  useEffect(() => {
    const savedAvatar = localStorage.getItem("selectedAvatar");
    if (savedAvatar) {
      const icon = ANIMAL_ICONS.find((i) => i.src === savedAvatar);
      if (icon) setSelectedIconId(icon.id);
    }
  }, []);

  const handleSelectIcon = (id: number, src: string) => {
    setSelectedIconId(id);
    localStorage.setItem("selectedAvatar", src);
    window.dispatchEvent(new Event("avatarChanged"));
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <h3 className="text-[16px] font-semibold mb-1" style={{ color: titleColor }}>
          Escolha seu Avatar
        </h3>
        <p className="text-[13px]" style={{ color: theme.colors.muted }}>
          Personalize seu perfil com um dos nossos mascotes da fauna brasileira.
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-4">
        {ANIMAL_ICONS.map((icon) => {
          const isSelected = selectedIconId === icon.id;
          return (
            <div key={icon.id} className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectIcon(icon.id, icon.src)}
                className="flex h-[70px] w-[70px] items-center justify-center rounded-full border-2 bg-white transition-all hover:scale-105"
                style={{
                  borderColor: isSelected ? accent : "#e5e7eb",
                  boxShadow: isSelected ? `0 0 0 3px ${accent}33` : "none",
                }}
              >
                <Image src={icon.src} alt={icon.alt} width={52} height={52} className="object-contain" />
              </button>
              <span className="text-[11px] font-medium" style={{ color: isSelected ? accent : theme.colors.muted }}>
                {icon.alt}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 h-5 text-center">
        {selectedIconId ? (
          <span className="text-[13px] font-medium" style={{ color: accent }}>
            Você escolheu: {ANIMAL_ICONS.find((i) => i.id === selectedIconId)?.alt}
          </span>
        ) : (
          <span className="text-[13px]" style={{ color: theme.colors.muted }}>
            Selecione um ícone acima
          </span>
        )}
      </div>
    </div>
  );
}
