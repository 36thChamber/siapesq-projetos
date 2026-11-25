export const PREFIXO_TIF_ADEQUABILIDADE = "predicoes_cenarios";

export type AnaliseStorage = {
  nome_dataset: string | null;
  nome_pasta: string | null;
  cenario: string | null;
  nome_arquivo: string | null;
};

export class AnaliseStorageInvalido extends Error {
  constructor() {
    super("Análise sem mapeamento de storage válido.");
  }
}

function segmentoValido(valor: string | null): valor is string {
  return (
    typeof valor === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(valor) &&
    !valor.includes("..")
  );
}

export function resolverTifAdequabilidade(analise: AnaliseStorage): string {
  const segmentos = [
    analise.nome_dataset,
    analise.nome_pasta,
    analise.cenario,
    analise.nome_arquivo,
  ];

  if (
    !segmentos.every(segmentoValido) ||
    !analise.nome_arquivo?.endsWith("_adequabilidade.tif")
  ) {
    throw new AnaliseStorageInvalido();
  }

  return [PREFIXO_TIF_ADEQUABILIDADE, ...segmentos].join("/");
}

export function resolverPrefixoAnualOcorrencias(
  analise: Pick<AnaliseStorage, "nome_dataset" | "nome_pasta">,
): string {
  const cenario = "anual_2015_2024";
  const segmentos = [analise.nome_dataset, analise.nome_pasta, cenario];

  if (!segmentos.every(segmentoValido)) {
    throw new AnaliseStorageInvalido();
  }

  return `${[PREFIXO_TIF_ADEQUABILIDADE, ...segmentos].join("/")}/`;
}
