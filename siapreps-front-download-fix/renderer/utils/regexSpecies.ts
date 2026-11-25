type ScientificSpecies = {
  genus: string;
  species: string;
};

const SPECIES_LIST: ScientificSpecies[] = [
  { genus: "Alouatta", species: "caraya" },
  { genus: "Alouatta", species: "guariba" },
  { genus: "Sapajus", species: "nigritus" },
  // adiciona mais aqui 👇
];

export function italicizeScientificNames(text: string): string {
  if (!text) return text;

  let formattedText = text;

  SPECIES_LIST.forEach(({ genus, species }) => {
    const genusEscaped = escapeRegex(genus);
    const speciesEscaped = escapeRegex(species);

    // 1️⃣ Nome completo (Alouatta caraya)
    const fullRegex = new RegExp(
      `\\b(${genusEscaped}\\s+${speciesEscaped})\\b`,
      "gi"
    );
    formattedText = formattedText.replace(
      fullRegex,
      "<i>$1</i>"
    );

    // 2️⃣ Gênero sozinho (Alouatta)
    const genusRegex = new RegExp(
      `\\b(${genusEscaped})\\b(?![^<]*</i>)`,
      "gi"
    );
    formattedText = formattedText.replace(
      genusRegex,
      "<i>$1</i>"
    );

    // 3️⃣ Epíteto sozinho (caraya)
    const speciesRegex = new RegExp(
      `\\b(${speciesEscaped})\\b(?![^<]*</i>)`,
      "gi"
    );
    formattedText = formattedText.replace(
      speciesRegex,
      "<i>$1</i>"
    );
  });

  return formattedText;
}

// Evita quebrar regex com caracteres especiais
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
