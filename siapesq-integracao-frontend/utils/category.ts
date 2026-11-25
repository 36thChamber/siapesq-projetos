import { DEFAULT_GROUP_ICON, groupIcons } from "./icons";

/**
 * Normaliza o nome da categoria para uso interno (ex: ícones, rotas)
 */
export function normalizeCategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Resolve o ícone correspondente à categoria.
 * Retorna um ícone padrão quando o grupo não possui mapeamento.
 */
export function resolveCategoryIcon(categoryName: string): string {
  const normalizedCategoryName = normalizeCategoryName(categoryName);
  const matchedGroup = Object.entries(groupIcons).find(([groupName]) =>
    normalizedCategoryName.includes(groupName),
  );

  return matchedGroup?.[1] ?? DEFAULT_GROUP_ICON;
}
