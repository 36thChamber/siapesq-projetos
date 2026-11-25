export interface ITooltip {
  id: string;
  text: string;
  ref: React.MutableRefObject<HTMLElement | null>;
}

type TooltipRefParams = {
  id: string;
  refEl: React.MutableRefObject<HTMLElement | null>;
};

/**
 * Função que retorna um array de tooltips com base nos elementos de
 * referência recebidos.
 *
 * Insira novos tooltips no array abaixo e referencie-os na função
 * ao usá-la em um componente.
 * @param {TooltipRefParams[]} reference
 * @param {string} reference[].id
 * @param {React.MutableRefObject<HTMLElement | null>} reference[].refEl
 * @returns {ITooltip[]}
 */
export const tooltipsProps = (reference: TooltipRefParams[]) => {
  const tooltips: ITooltip[] = [
    {
      id: "mapDoubleClickRef",
      text: "Clicando duas vezes em qualquer ponto do mapa você pode marcar um destino.",
      ref: reference.find((ref) => ref.id === "mapDoubleClickRef")?.refEl ?? {
        current: null,
      },
    },
    {
      id: "updateGeoTiffsRef",
      text: "Aqui você pode atualizar as imagens de satélite sobre a espécie selecionada.",
      ref: reference.find((ref) => ref.id === "updateGeoTiffsRef")?.refEl ?? {
        current: null,
      },
    },
    {
      id: "changeSpeciesTiffRef",
      text: "Aqui vocé pode alterar a espécie mostrada no mapa de rastreamento.",
      ref: reference.find((ref) => ref.id === "changeSpeciesTiffRef")?.refEl ?? {
        current: null,
      },
    },
  ];

  return tooltips;
};

export const handleNext = (
  tooltips: ITooltip[],
  currentStep: number,
  onCurrentStepChange: (step: number) => void,
  onHideTooltipsChange: (hide: boolean) => void
) => {
  if (currentStep < tooltips.length - 1) {
    onCurrentStepChange(currentStep + 1);
  } else {
    onHideTooltipsChange(true);
  }
};

export const handleClose = (onHideTooltipsChange: (hide: boolean) => void) => {
  localStorage.setItem("onboardingSkipped", "true");
  onHideTooltipsChange(true);
};
