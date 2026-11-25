import { Especie as Specie } from "@/services/types/especie.types";

interface SpecieRowProps {
  specie: Specie;
}

export default function SpecieRow({ specie }: SpecieRowProps) {
  return (
    <tr className="border-t hover:bg-gray-50 transition-colors">
      <td className="p-3 text-[#233263]">{specie.grupoespecie?.nome}</td>
      <td className="p-3 text-[#233263]">{specie.nome}</td>
      <td className="p-3 text-[#233263]">{specie.nome_cientifico}</td>
      <td className="p-3 text-[#233263]">{specie.pesquisador}</td>
      {/* <td className="p-3 relative">
       <UserActions user={user} />
      </td> */}
    </tr>
  );
}
