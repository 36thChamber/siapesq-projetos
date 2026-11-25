"use client";

import { Usuario } from "@/services/types/usuario.types";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import IconPickerSection from "@/sections/profile/IconPickerSection";
import { USER_TYPE_LABEL } from "@/utils/users";
import Image from "next/image";
import { useState, useEffect } from "react";

interface Props {
  user: Usuario;
}

function formatDate(raw: string | null) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return raw;
  }
}

export default function ProfileHeader({ user }: Props) {
  const { theme } = usePlatformTheme();
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const saved = localStorage.getItem("selectedAvatar");
      setAvatar(saved);
      if (saved) setShowIconPicker(false);
    };
    load();
    window.addEventListener("avatarChanged", load);
    return () => window.removeEventListener("avatarChanged", load);
  }, []);

  const role = USER_TYPE_LABEL[user.tipo_usuario] ?? user.tipo_usuario;
  const c = theme.colors as any;
  const titleColor = c.titleColor ?? c.text;
  const accent = c.brandBlue ?? c.primary[500];

  return (
    <>
      <div className="bg-white border border-[#f8fafc] rounded-[12px] shadow-[0px_4px_10px_rgba(124,45,18,0.06)] p-[33px] w-full">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">

          {/* Avatar */}
          <div
            className="relative flex-shrink-0 cursor-pointer"
            onClick={() => setShowIconPicker((p) => !p)}
            title="Clique para trocar seu avatar"
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-[3px]"
              style={{ borderColor: accent, backgroundColor: `${accent}33` }}
            >
              {avatar ? (
                <Image src={avatar} alt="Avatar" width={64} height={64} unoptimized className="object-contain" />
              ) : (
                <Image src="/icon_user_login.svg" alt="Avatar padrão" width={52} height={52} className="object-contain" />
              )}
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-[#f8fafc] rounded-full flex items-center justify-center shadow-[0px_1px_1px_rgba(0,0,0,0.05)]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Informações */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h1 className="text-[28px] font-bold leading-tight" style={{ color: titleColor }}>
                {user.nome}
              </h1>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill={accent} />
                <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <p className="text-[12px] italic uppercase tracking-[1.2px]" style={{ color: accent }}>
              {role}
            </p>

            <div className="flex justify-center sm:justify-start mt-1 mb-2">
              <span
                className="text-[12px] font-medium px-[13px] py-[3px] rounded-full border bg-[#f8fafc]"
                style={{ borderColor: accent, color: accent }}
              >
                {role} Verificado
              </span>
            </div>

            <p className="text-[12px]" style={{ color: theme.colors.muted }}>
              Último acesso: {formatDate(user.ultimo_acesso)}
            </p>
          </div>

          {/* Botões */}
          <div className="flex flex-col gap-2 flex-shrink-0 items-center sm:items-end">
            <button
              type="button"
              className="px-[27px] py-[9px] rounded-[8px] border text-[14px] font-semibold tracking-[0.7px] transition-opacity hover:opacity-70"
              style={{ borderColor: accent, color: accent }}
              onClick={() => setShowIconPicker((p) => !p)}
            >
              Editar Icone
            </button>
          </div>
        </div>
      </div>

      {/* Avatar picker */}
      {showIconPicker && (
        <div className="bg-white border border-[#f8fafc] rounded-[12px] shadow-[0px_4px_10px_rgba(124,45,18,0.06)] p-6 w-full">
          <IconPickerSection />
        </div>
      )}
    </>
  );
}
