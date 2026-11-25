import { get_especie_id } from "../../../controllers/especies-controller";
import { type_get_id_especie_response } from "../../../controllers/types/especies-types";
import { useEffect, useState } from "react";
import { addArticlesInDescription } from "../../../utils/description";
import { italicizeScientificNames } from "../../../utils/regexSpecies";

type field = {
  tittle: string;
  text: string;
  referencia?: string;
  link?: string;
};

export type descriptionProps = {
  fields: Array<field>;
};

type getId = type_get_id_especie_response & {
  descricao: string;
};

export function Description({
  fields,
  especie,
  hideDescricao,
  onlyDescricao,
}: descriptionProps & {
  especie: string;
  hideDescricao?: boolean;
  onlyDescricao?: boolean;
}) {
  const [details, setDetails] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 2500; // Máximo de caracteres antes de truncar

  useEffect(() => {
    async function fetchData() {
      const token = await window.auth.getToken();
      if (!token) return;
      const res = (await get_especie_id(especie)) as getId;

      let descricaoFinal = await addArticlesInDescription(
        res.descricao,
        token
      );
      descricaoFinal = italicizeScientificNames(descricaoFinal)

      setDetails(descricaoFinal);
    }

   
      fetchData();
    
  }, [ especie]);

  // Só trunca a descricao (quebra em ref/palavra longa)
  const getPreview = (text: string) => {
    if (text.length <= maxLength) return text;
    const sentences = text.split(/[\.\!\?]\s+/);
    for (let i = 1; i < sentences.length; i++) {
      const slice = sentences.slice(0, i).join("");
      if (slice.length > maxLength) {
        // Quebra em palavra longa/referência
        const words = sentences[i - 1].split(/\s+/);
        for (let j = words.length - 1; j > 0; j--) {
          const prefix =
            sentences.slice(0, i - 1).join(". ") +
            ". " +
            words.slice(0, j).join(" ");
          if (prefix.length > maxLength - 50) return prefix;
        }
        return slice.slice(0, maxLength);
      }
    }
    return text.slice(0, maxLength);
  };

  const previewDetails = getPreview(details);
  const showButton = details.length > maxLength;

  return (
    <div>
      <ul className="description-container">
        {/* MANTEVE IGUAL: todos os fields separados */}
        {!onlyDescricao &&
          fields.map(({ tittle, text, referencia, link }, index) => (
            <li key={index} className="description">
              <span className="description-title">{tittle}:</span>
              <span className="description-text">{text}</span>

              {referencia && link && (
                <span className="description-reference">
                  <button
                    onClick={() => window.open(link)}
                    className="hover:underline ml-1"
                  >
                    {referencia}
                  </button>
                </span>
              )}
            </li>
          ))}

        {/* Descrição com Ver mais (só ela é truncada) */}
        {!hideDescricao && (
          <div className="mt-4">
            <span className="description-title">Descrição:</span>

            <div
              className="description-text"
              dangerouslySetInnerHTML={{
                __html: isExpanded ? details : previewDetails + "...",
              }}
            />

            {showButton && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="mt-2 px-3 py-1 bg-dark_green text-white text-xs rounded"
              >
                Ver mais
              </button>
            )}

            {isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="mt-2 px-3 py-1 bg-gray-600 text-white text-xs rounded"
              >
                Ver menos
              </button>
            )}
          </div>
        )}
      </ul>
    </div>
  );
}
