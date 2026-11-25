"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { DropdownItem, ReusableDropdown } from "@/components/ui/dropdown";
import type { PlatformState } from "@/config/platformThemes";

const PLATFORM_STATES = [
  { label: "Rio Grande do Sul", value: "RS" },
  { label: "Espírito Santo", value: "ES" },
  { label: "Minas Gerais", value: "MG" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: PlatformState;
}>;

type HeaderProps = {
  reloadPage?: () => void;
};

export default function Header({
  reloadPage = () => window.location.reload(),
}: HeaderProps) {
  const {
    user,
    logout,
    loading: authLoading,
    logoutPending,
    logoutError,
  } = useAuth();
  const { theme, selectedState, setSelectedState } = usePlatformTheme();
  const router = useRouter();
  const primaryColor = theme.colors.primary[500];

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileStateMenuOpen, setMobileStateMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState<string>("/icon_user_login.svg");

  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const loadAvatar = () => {
      const savedAvatar = localStorage.getItem("selectedAvatar");

      if (savedAvatar && isLoggedIn) {
        setAvatar(savedAvatar);
      } else {
        setAvatar("/icon_user_login.svg");
      }
    };

    loadAvatar();
    window.addEventListener("avatarChanged", loadAvatar);

    return () => window.removeEventListener("avatarChanged", loadAvatar);
  }, [isLoggedIn]);

  const handleLogin = () => {
    router.push("/login");
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    if (logoutPending) return;

    const completed = await logout();
    if (!completed) return;

    localStorage.removeItem("selectedAvatar");
    window.dispatchEvent(new Event("avatarChanged"));
    setMobileOpen(false);
  };

  const handleStateChange = (state: PlatformState) => {
    setSelectedState(state);
    setMobileStateMenuOpen(false);
    setMobileOpen(false);

    if (state !== selectedState) reloadPage();
  };

  const getProfileItems = (): DropdownItem[] => {
    const items: DropdownItem[] = [
      {
        label: "Perfil",
        value: "perfil",
        onClick: () => {
          router.push("/profile");
          setMobileOpen(false);
        },
      },
    ];

    if (user?.tipo_usuario?.toLowerCase() === "admin") {
      items.push({
        label: "Área Admin",
        value: "admin",
        onClick: () => {
          router.push("/admin");
          setMobileOpen(false);
        },
      });
    }

    items.push({
      label: "Trocar estado",
      value: "trocar-estado",
      subItems: PLATFORM_STATES.map((state) => ({
        label: state.label,
        value: state.value,
        selected: selectedState === state.value,
        onClick: () => handleStateChange(state.value),
      })),
    });

    items.push({
      label: logoutPending ? "Saindo..." : "Sair",
      value: "sair",
      onClick: () => {
        void handleLogout();
      },
    });

    return items;
  };

  const trigger = (
    <div className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
      <div className="w-[30px] h-[30px] rounded-full overflow-hidden flex items-center justify-center relative" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: primaryColor, backgroundColor: `${primaryColor}1A` }}>
        {avatar !== "/icon_user_login.svg" ? (
          <Image src={avatar} alt="Foto do usuário" fill unoptimized className="object-cover p-1" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="w-[16px] h-[16px]" aria-hidden="true">
            <circle cx="12" cy="8" r="4" stroke={primaryColor} strokeWidth="1.8" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={primaryColor} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <span className="text-sm font-medium" style={{ color: primaryColor }}>
        Olá{" "}
        <span className="font-semibold">{user?.nome?.split(" ")[0]}</span>
      </span>
    </div>
  );

  return (
    <div className="relative bg-white z-[1000] top-0 shadow-sm">
      <div className="flex justify-between items-center px-6 md:px-10 h-[60px]">
        <Link href="/home">
          <Image
            src={theme.logo}
            alt={`Logo SIAPESQ-${selectedState}`}
            width={140}
            height={50}
            className="object-contain"
            style={{
              width: "auto",
              height: "auto",
            }}
          />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {authLoading ? (
            <div className="w-[92px] h-[36px] rounded-lg bg-slate-100 animate-pulse" />
          ) : isLoggedIn ? (
            <ReusableDropdown
              trigger={trigger}
              items={getProfileItems()}
              menuLabel="Menu do usuário"
            />
          ) : (
            <button
              onClick={handleLogin}
              className="text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition"
              style={{ backgroundColor: primaryColor }}
            >
              Entrar
            </button>
          )}
        </div>

        <button
          className="md:hidden flex items-center p-2"
          onClick={() => {
            setMobileOpen((current) => !current);
            if (mobileOpen) setMobileStateMenuOpen(false);
          }}
          aria-expanded={mobileOpen}
          aria-label="Menu do usuário"
        >
          <div className="space-y-1.5">
            <span className={`block w-6 h-0.5 transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} style={{ backgroundColor: primaryColor }} />
            <span className={`block w-6 h-0.5 ${mobileOpen ? 'opacity-0' : ''}`} style={{ backgroundColor: primaryColor }} />
            <span className={`block w-6 h-0.5 transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} style={{ backgroundColor: primaryColor }} />
          </div>
        </button>
      </div>

      {logoutError && (
        <div
          role="alert"
          className="flex items-center justify-center gap-3 border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          <span>{logoutError}</span>
          <button
            type="button"
            disabled={logoutPending}
            className="font-semibold underline underline-offset-2 disabled:opacity-60"
            onClick={() => void handleLogout()}
          >
            {logoutPending ? "Tentando..." : "Tentar novamente"}
          </button>
        </div>
      )}

      {mobileOpen && (
        <div className="md:hidden px-6 py-4 border-t border-slate-100 bg-white shadow-sm">
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[32px] h-[32px] rounded-full overflow-hidden flex items-center justify-center relative" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: primaryColor, backgroundColor: `${primaryColor}1A` }}>
                  {avatar !== "/icon_user_login.svg" ? (
                    <Image src={avatar} alt="Foto do usuário" fill unoptimized className="object-cover p-1" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" stroke={primaryColor} strokeWidth="1.8" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={primaryColor} strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </div>

                <span className="text-sm font-medium" style={{ color: primaryColor }}>
                  Olá {user?.nome?.split(" ")[0]}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {getProfileItems().map((item) =>
                  item.subItems?.length ? (
                    <div key={item.value}>
                      <button
                        type="button"
                        onClick={() =>
                          setMobileStateMenuOpen((current) => !current)
                        }
                        className="flex w-full items-center justify-between text-left transition hover:opacity-70"
                        style={{ color: primaryColor }}
                        aria-haspopup="menu"
                        aria-expanded={mobileStateMenuOpen}
                      >
                        <span>{item.label}</span>
                        <span aria-hidden="true">›</span>
                      </button>

                      {mobileStateMenuOpen && (
                        <div
                          role="menu"
                          aria-label={item.label}
                          className="mt-2 flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                        >
                          {item.subItems.map((subItem) => (
                            <button
                              key={subItem.value}
                              type="button"
                              role="menuitemradio"
                              aria-checked={Boolean(subItem.selected)}
                              onClick={subItem.onClick}
                              className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 ${
                                subItem.selected
                                  ? "bg-gray-100 font-semibold"
                                  : ""
                              }`}
                            >
                              <span>{subItem.label}</span>
                              {subItem.selected && (
                                <span aria-hidden="true">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      key={item.value}
                      type="button"
                      onClick={item.onClick}
                      className="block w-full text-left hover:opacity-70 transition"
                      style={{ color: primaryColor }}
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition"
              style={{ backgroundColor: primaryColor }}
            >
              Entrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
