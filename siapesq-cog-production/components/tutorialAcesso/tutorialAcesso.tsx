import { modalsT } from "@/app/faq/page";
import { StepType } from "@/utils/steps";
import { useEffect, useState } from "react";

type StepExtended = StepType & {
  imgMobile?: string;
};

const steps: Array<StepExtended> = [
  {
    title: "Primeiro acesso",
    img: "/tutorialLogin/img1.png",
    imgMobile: "/tutorialLogin/img1_mobile.png",
    text: "Em seu primeiro acesso, clique em cadastrar para criar uma nova conta.",
  },
  {
    title: "Criando conta",
    img: "/tutorialLogin/img2.png",
    imgMobile: "/tutorialLogin/img2_mobile.png",
    text: "Preencha o formulário de cadastro para criar uma nova conta.",
  },
  {
    title: "Acessando o app",
    img: "/tutorialLogin/img3.png",
    imgMobile: "/tutorialLogin/img3_mobile.png",
    text: "Preencha o formulário de login com os dados da conta criada para acessar a aplicação.",
  },
];

export type modalProps = {
  setDisplayModalP: (val: modalsT) => void;
};

export default function TutorialModal({
  setDisplayModalP,
}: modalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const stepsValues: Array<StepExtended> = steps;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentImage =
    isMobile && stepsValues[currentStep].imgMobile
      ? stepsValues[currentStep].imgMobile
      : stepsValues[currentStep].img;

  return (
    <div className="bg-white rounded-md p-5 z-[1000] fixed top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 shadow-lg w-[90%] max-w-[700px]">
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
          src={currentImage}
          alt={`Step ${currentStep}`}
          className="rounded-md object-contain max-h-[60vh]"
        />

        <div className="flex flex-col gap-1 mt-2">
          <h2 className="font-medium text-lg">
            {stepsValues[currentStep].title}
          </h2>

          <p className="text-sm">
            {stepsValues[currentStep].text}
          </p>
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