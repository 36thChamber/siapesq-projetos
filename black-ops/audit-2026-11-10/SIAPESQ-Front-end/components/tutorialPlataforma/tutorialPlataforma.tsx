import { StepType } from "@/utils/steps";
import { useEffect, useState } from "react";
import { modalProps } from "../tutorialAcesso/tutorialAcesso";

type StepExtended = StepType & {
  imgMobile?: string;
};

const desktopSteps: Array<StepExtended> = [
  {
    title: "Categorias",
    img: "/tutorialPlataforma/img1.png",
    text: "Acesse as espécies de uma categoria específica por meio do menu superior.",
  },
  {
    title: "Espécies",
    img: "/tutorialPlataforma/img2.png",
    text: "Clique em um dos itens da barra lateral, dentro de uma das categorias de animais para acessar uma espécie.",
  },
  {
    title: "Localização da espécie",
    img: "/tutorialPlataforma/img3.png",
    text: "Acesse a área de mapa da espécie por meio do link de monitoramento.",
  },
  {
    title: "Análises da espécie",
    img: "/tutorialPlataforma/img4.png",
    text: "Selecione uma análise para monitorar a espécie escolhida.",
  },
];

const mobileSteps: Array<StepExtended> = [
  {
    title: "Abrindo o menu",
    img: "/tutorialPlataforma/img1_mobile.png",
    text: "Escolha uma categoria de espécies para visualizar os animais disponíveis.",
  },
  {
    title: "Selecionando categoria",
    img: "/tutorialPlataforma/img2_mobile.png",
    text:  "Clique em Especies para abrir a lista de espécies disponíveis",
  },
  {
    title: "Selecionando espécie",
    img: "/tutorialPlataforma/img3_mobile.png",
    text: "Selecione uma espécie para visualizar as informações disponíveis sobre ela.",
  },
  {
    title: "Área de monitoramento",
    img: "/tutorialPlataforma/img4_mobile.png",
    text: "Acesse o monitoramento da espécie clicando no botão destacado.",
  },
  {
    title: "Selecionando análise",
    img: "/tutorialPlataforma/img5_mobile.png",
    text: "Escolha uma análise disponível para visualizar os dados da espécie selecionada.",
  },
];
export default function TutorialPlataforma({ setDisplayModalP }: modalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;

      setIsMobile(mobile);
      setCurrentStep(0);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const stepsValues = isMobile ? mobileSteps : desktopSteps;

  return (
    <div className="bg-white rounded-md p-5 z-[1000] fixed top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 shadow-lg w-[90%] max-w-[780px]">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-xs">
          {currentStep + 1} de {stepsValues.length}
        </p>

        <button
          className="font-semibold text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setDisplayModalP("none");
          }}
        >
          X
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-5">
        <img
          src={stepsValues[currentStep].img}
          alt={`Step ${currentStep + 1}`}
          className="rounded-md object-contain max-h-[60vh] mx-auto"
        />

        <div className="flex flex-col gap-1 mt-2">
          <h2 className="font-medium text-lg">
            {stepsValues[currentStep].title}
          </h2>

          <p className="text-sm">{stepsValues[currentStep].text}</p>
        </div>
      </div>

      <div className="flex flex-row justify-between text-sm">
        <button
          className="flex gap-1 border-black border-[1px] border-solid py-1 px-4 rounded-2xl disabled:opacity-40"
          onClick={() => {
            setCurrentStep((cs) => cs - 1);
          }}
          disabled={!(currentStep > 0)}
        >
          <span>←</span> Anterior
        </button>

        <button
          className="flex gap-1 border-black border-[1px] border-solid py-1 px-4 rounded-2xl disabled:opacity-40"
          disabled={!(currentStep < stepsValues.length - 1)}
          onClick={() => {
            setCurrentStep((cs) => cs + 1);
          }}
        >
          Próximo <span>→</span>
        </button>
      </div>
    </div>
  );
}