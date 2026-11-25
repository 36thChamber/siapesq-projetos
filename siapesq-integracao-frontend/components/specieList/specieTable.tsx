import { Especie as Specie } from "@/services/types/especie.types";
import SpecieRow from "./specieRow";

interface SpeciesTableProps {
  species: Specie[];
}

export default function SpeciesTable({ species }: SpeciesTableProps) {
  return (
    <div
      className="h-full overflow-auto border rounded-sm"
      style={{ position: "relative" }}
    >
      <table className="w-full text-left border-collapse">
        <thead className="bg-[rgba(39,132,190,0.42)] sticky top-0 z-10">
          <tr>
            <th className="p-3 text-[#233263] font-bold">Grupo</th>
            <th className="p-3 text-[#233263] font-bold">Nome</th>
            <th className="p-3 text-[#233263] font-bold">Nome Científico</th>
            <th className="p-3 text-[#233263] font-bold">Pesquisador</th>
            <th className="p-3 text-[#233263] font-bold">Ações</th>
          </tr>
        </thead>
        <tbody style={{ position: "relative" }}>
          {Array.isArray(species) && species.length > 0 ? (
            species.map((specie, index) => (
              <SpecieRow
              key={`specie-${specie.id_especie}`}
                specie={specie}
              />
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-500">
                Nenhuma espécie encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
