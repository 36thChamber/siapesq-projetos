import React, { useState } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
import H2 from "../../atoms/h2";
import ButtonWhite from "../../../../components/atoms/button/buttonWhite";

const Modal7 = ({ onClose }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = [
    require("../../../assets/image/Tutorial/tutorial_1.png"),
    require("../../../assets/image/Tutorial/tutorial_2.png"),
    require("../../../assets/image/Tutorial/tutorial_3.png")
  ];

  const handlePrev = () => {
    setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "aliceblue",
          padding: "20px",
          borderRadius: "8px",
          height: "76%",
          maxWidth: "70%",
          width: "100%",
          textAlign: "center",
        }}
      >
        {currentImage > 0 && (
          <div
            style={{
              marginLeft: "10px",
              marginRight: "20px",
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
            }}
            onClick={handlePrev}
          >
            <Image
              height={120}
              width={40}
              src={require("../../../assets/image/Tutorial/tutorial_left.png")} alt={""}            />
          </div>
        )}

        <H2
          opacity={1}
          color="#000000"
          fontSize={"20px"}
          text={"Tutorial da Aplicação"}
        /><br />

        <Image
           height={350}
           width={550}
          src={images[currentImage]} alt={""}        /><br /><br />

        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
          <ButtonWhite
            backgroundcolor="#2d81af"
            width={100}
            text="Fechar"
            fontcolor="#fff"
            onClick={onClose}
          />
        </div>

        {currentImage < images.length - 1 && (
          <div
            style={{
              marginLeft: "10px",
              marginRight: "20px",
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
            }}
            onClick={handleNext}
          >
            <Image
              height={120}
              width={40}
              src={require("../../../assets/image/Tutorial/tutorial_right.png")} alt={""}            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal7;
