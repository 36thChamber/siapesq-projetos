import { Especie as Specie } from "@/services/types/especie.types";
import { useSpeciesList } from "@/hook/useSpeciesList";
import { useSpeciesSidebar } from "@/hook/useSpeciesSidebar";
import { useSpeciesImagesPreload } from "@/hook/useSpeciesImagesPreload";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

interface SpeciesProps {
  category: string;
  onSelectSpecie: (specie: Specie) => void;
}

export default function Species({ category, onSelectSpecie }: SpeciesProps) {
  const { species, categoryName, selectedId, selectSpecie, loading, error } =
    useSpeciesList({ category, onSelectSpecie });

  const { openSidebar, closeSidebar, sidebarClass } = useSpeciesSidebar();

  useSpeciesImagesPreload(species);

  const { theme } = usePlatformTheme();

  if (loading) {
    return (
      <div className="p-4 italic" style={{ color: theme.colors.muted }}>
        Carregando espécies...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="col-span-2 p-4 text-red-600 max-[1024px]:col-span-full"
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="col-span-2 p-4 rounded-lg max-md:shadow-none max-[1024px]:col-span-full max-[1024px]:p-0">
      <button
        className="sideBarButton w-full shadow-md md:hidden"
        onClick={openSidebar}
      >
        Espécies {">"}
      </button>

      <div className={`sideBar ${sidebarClass}`}>
        <button className="sideBarCloseButton" onClick={closeSidebar}>
          X
        </button>

        <h2
          className="text-xl font-bold mb-4"
          style={{ color: theme.colors.titleColor }}
        >
          {categoryName}
        </h2>

        <ul className="flex flex-col flex-nowrap gap-y-2">
          {Array.isArray(species) && species.length > 0 ? (
            species.map((specie: Specie) => {
              const isActive = selectedId === specie.id_especie;

              return (
                <li
                  key={specie.id_especie}
                  onClick={() => {
                    selectSpecie(specie);
                    if (window.innerWidth < 728) closeSidebar();
                  }}
                  className={`flex flex-col gap-y-1 cursor-pointer transition-all p-3 
                    ${isActive ? "shadow-md rounded-r-md rounded-l-sm" : "hover:bg-gray-50 rounded-md"}
                  `}
                  style={{
                    backgroundColor: isActive
                      ? theme.colors.primary[100]
                      : "transparent",
                    borderLeft: isActive
                      ? `4px solid ${theme.colors.primary[500]}`
                      : "4px solid transparent",
                    borderBottom: !isActive
                      ? `1px solid ${theme.colors.gray[200]}`
                      : "none",
                  }}
                >
                  <span
                    className={`text-base ${isActive ? "font-bold" : "font-medium"}`}
                    style={{ color: theme.colors.text }}
                  >
                    {specie.nome}
                  </span>
                  <span
                    className="text-sm italic"
                    style={{ color: theme.colors.muted }}
                  >
                    {specie.nome_cientifico}
                  </span>
                </li>
              );
            })
          ) : (
            <p className="italic" style={{ color: theme.colors.muted }}>
              Nenhuma espécie encontrada.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
