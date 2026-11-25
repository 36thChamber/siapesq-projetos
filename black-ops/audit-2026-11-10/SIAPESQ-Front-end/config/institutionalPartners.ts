import { PlatformState } from "./platformThemes";

export interface InstitutionalPartner {
  id: string;
  name: string;
  description: string;
  logo: string;
  states: PlatformState[];
  priority?: number;
}

export const institutionalPartners: InstitutionalPartner[] = [
  {
    id: "fapergs",
    name: "FAPERGS",
    description:
      "Instituição fundamental no Rio Grande do Sul, com foco estratégico no financiamento de pesquisas que impulsionam a inovação e o desenvolvimento científico do estado.",
    logo: "/partners/fapergs.svg",
    states: ["RS"],
    priority: 1,
  },
  {
    id: "fapes",
    name: "FAPES",
    description:
      "Atua como motor da inovação no Espírito Santo, promovendo o avanço tecnológico e integrando a ciência ao desenvolvimento sustentável do estado.",
    logo: "/partners/fapes.svg",
    states: ["ES"],
    priority: 1,
  },
  {
    id: "ifes-guarapari",
    name: "IFES Campus Guarapari",
    description:
      "Braço técnico e acadêmico essencial, fornecendo infraestrutura de ponta e expertise em coleta e análise de dados para o monitoramento da biodiversidade capixaba.",
    logo: "/partners/governo-es.svg",
    states: ["ES"],
    priority: 2,
  },
  {
    id: "fapemig",
    name: "FAPEMIG",
    description:
      "Referência em Minas Gerais, a fundação apoia projetos de pesquisa de alto impacto que visam o desenvolvimento científico, tecnológico e a inovação no estado.",
    logo: "/partners/fapemig.svg",
    states: ["MG"],
    priority: 1,
  },
];

/**
 * Ordena os parceiros priorizando o estado atual da plataforma, sem alterar o array original.
 * Sem estado válido (ausente ou desconhecido), preserva a ordem padrão de cadastro.
 */
export const orderPartnersByState = (
  partners: InstitutionalPartner[],
  currentState?: PlatformState | null,
): InstitutionalPartner[] => {
  if (!currentState) {
    return partners;
  }

  return [...partners].sort((partnerA, partnerB) => {
    const partnerAIsCurrentState = partnerA.states.includes(currentState);
    const partnerBIsCurrentState = partnerB.states.includes(currentState);

    if (partnerAIsCurrentState !== partnerBIsCurrentState) {
      return partnerAIsCurrentState ? -1 : 1;
    }

    if (partnerAIsCurrentState && partnerBIsCurrentState) {
      return (partnerA.priority ?? 999) - (partnerB.priority ?? 999);
    }

    return 0;
  });
};
