import { useState } from "react";
import {
  handleClose,
  handleNext,
  ITooltip,
} from "../../../funcao/tooltips/onBoardingTooltips";
import GeoTiffTooltip from "../GeoTiffInfoTooltip";
import OnboardingTooltip from "../OnboardingTooltip";

interface ITooltipscomponent {
  tooltips: ITooltip[];
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  hideTooltipInfos: boolean;
  setHideToolTipInfos: React.Dispatch<React.SetStateAction<boolean>>;
  hideTooltipGeoRaster: boolean;
  setHideTooltipGeoRaster: React.Dispatch<React.SetStateAction<boolean>>;
  mostrarBotaoConfig: boolean;
  geoRasterLayerIsLoaded: boolean;
  setGeoRasterLayerIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  positionT: boolean;
}

const TooltipsComponent = ({
  tooltips,
  currentStep,
  setCurrentStep,
  hideTooltipInfos,
  setHideToolTipInfos,
  hideTooltipGeoRaster,
  setHideTooltipGeoRaster,
  mostrarBotaoConfig,
  geoRasterLayerIsLoaded,
  setGeoRasterLayerIsLoaded,
  positionT,
}: ITooltipscomponent) => {
  const [helpTutorialHovered, setHelpTutorialHovered] = useState(false);
  return (
    <>
      {!hideTooltipInfos && mostrarBotaoConfig && (
        <OnboardingTooltip
          tooltip={tooltips[currentStep]}
          visible
          onNext={() =>
            handleNext(tooltips, currentStep, setCurrentStep, setHideToolTipInfos)
          }
          onClose={() => handleClose(setHideToolTipInfos)}
        />
      )}

      {!hideTooltipGeoRaster &&
        geoRasterLayerIsLoaded &&
        localStorage.getItem("geoTiffTooltipSkipped") !== "true" && (
          <GeoTiffTooltip onClose={() => setGeoRasterLayerIsLoaded(false)} />
        )}

      <div
        onMouseEnter={() => setHelpTutorialHovered(true)}
        onMouseLeave={() => setHelpTutorialHovered(false)}
        onClick={() => {
          const stored = localStorage.getItem("onboardingSkipped");
          if (stored === "true" || currentStep > 0) {
            localStorage.setItem("onboardingSkipped", "false");
            setCurrentStep(0);
            setHideToolTipInfos(false);
            localStorage.setItem("geoTiffTooltipSkipped", "false");
          }
        }}
        style={{
          background: "#2D81AF",
          borderRadius: "25%",
          width: 32,
          height: 32,
          cursor: "pointer",
          position: "absolute",
          top: (positionT == true) ? "500px" : "330px",
          left: 10,
          zIndex: 99999999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transition: "transform 0.2s ease-in-out",
          transform: helpTutorialHovered ? "scale(1.1)" : "scale(1)",
        }}
      >
        <h2 style={{ color: "white", fontSize: "20px", fontWeight: "bold" }}>?</h2>
      </div>

      <span
        style={{
          color: "#2D81AF",
          position: "absolute",
          top: "515px",
          left: 60,
          transform: "translate(-50%, -50%)",
          marginLeft: "2.5rem",
          display: "flex",
          alignItems: "center",
          fontSize: "18px",
          fontWeight: "bold",
          width: "fit-content",
          flexWrap: "nowrap",
          zIndex: 999999999,
          opacity: helpTutorialHovered ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          pointerEvents: helpTutorialHovered ? "auto" : "none",
        }}
      >
        Ativar ajuda
      </span>
    </>
  );
};

export default TooltipsComponent;