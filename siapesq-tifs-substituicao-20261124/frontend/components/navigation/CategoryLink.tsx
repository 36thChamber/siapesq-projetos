"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GrupoEspecie } from "@/services/types/grupoEspecie.types";
import { resolveCategoryIcon } from "@/utils/category";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

type Props = {
  category: GrupoEspecie;
  isFirst?: boolean;
};

export default function CategoryLink({ category, isFirst = false }: Props) {
  const { theme } = usePlatformTheme();
  const pathname = usePathname();
  const iconPath = resolveCategoryIcon(category.nome);

  const isOnGroupPage = pathname.startsWith("/group/");
  const isActive = isOnGroupPage
    ? pathname === `/group/${category.id_gruposespecies}`
    : isFirst;

  return (
    <Link
      href={`/group/${category.id_gruposespecies}`}
      className="flex items-center sm:justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 sm:shrink sm:flex-1 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        color: isActive ? theme.colors.background : theme.colors.primary[500],
        backgroundColor: isActive
          ? theme.colors.primary[500]
          : theme.colors.gray[100],
        border: `1.5px solid ${isActive ? theme.colors.primary[500] : theme.colors.gray[200]}`,
      }}
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 shrink-0 bg-current transition-colors duration-200"
        style={{
          WebkitMaskImage: `url("${iconPath}")`,
          maskImage: `url("${iconPath}")`,
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
      <span>{category.nome}</span>
    </Link>
  );
}
