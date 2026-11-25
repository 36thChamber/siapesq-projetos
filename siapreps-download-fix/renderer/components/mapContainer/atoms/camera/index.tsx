import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import Image from "next/image";
import DivButton from '../divButton';
import Circulo from '../divCirculo';

type CameraComponentProps = {
  desativaBotoes: boolean;
  // children: React.ReactNode;
};

const CameraComponent: React.FC<CameraComponentProps> = ({ desativaBotoes }) => {
  const webcamRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [messageCamera, setMessageCamera] = useState(false);

  const handleCameraToggle = () => {
    setIsCameraOpen(!isCameraOpen);
  };

  const handleModalToggle = () => {
    setIsCameraOpen(!isCameraOpen);
    setMessageCamera(true);
  };

  const [webcamWidth, setWebcamWidth] = useState(400);
  const [webcamRight, setWebcamRight] = useState(-10);
  const [webcamBottom, setwebcamBottom] = useState(15);
  const [webcamHeight, setWebcamHeight] = useState(200);
  const [buttonLeft, setbuttonLeft] = useState("40px");
  const [buttonIcon, setIcon] = useState(true);
  const isAdmin = global?.window?.localStorage.getItem("showCam") === "true";
  const toggleFullScreen = () => {
    setIsCameraOpen(!isCameraOpen)
  };

  useEffect(() => {
    if (messageCamera) {
      const timer = setTimeout(() => {
        setMessageCamera(false);
      }, 2500); // 3 segundos

      // Limpa o timer quando o componente for desmontado ou quando a condição mudar
      return () => clearTimeout(timer);
    }
  }, [messageCamera]); // Esse efeito depende de messageCamera

  return (
    <>
      <div>
        <DivButton
          width={"150px"}
          height={"40px"}
          borderradius={"12px"}
          backgroundcolor={isAdmin ? "#1d1d1db7" : "#69696973"}
          onClick={handleModalToggle}
          disabled={desativaBotoes}
        >
          <h3 style={{ position: 'absolute', left: '63px', top: '-2px', color: '#f8f8f8da', fontSize: '13px' }}>Câmera</h3>
          <Circulo marginleft={"5px"} margintop={"5px"}>
            <Image src={require("../../../assets/image/camera.png")} alt={''} />
          </Circulo>
        </DivButton>

        {/* Modal for "Em breve" */}
        {messageCamera && !isAdmin && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '200px',
            }}>
              <h3>Em breve!</h3>
            </div>
          </div>
        )}


      </div>
      {isCameraOpen && isAdmin && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div style={{ position: 'relative', zIndex: 1000 }}>
            <button
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                outline: 'none',
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                zIndex: 1001
              }}
              onClick={toggleFullScreen}
            >
              <Circulo marginleft={buttonLeft} marginbottom={"-25px"}>
                {buttonIcon && (
                  <Image
                    src={require("../../../assets/image/FullScreen.png")}
                    style={{ transform: "rotateY(180deg)", position: 'absolute', top: '90px', right: '50px' }}
                    alt={''}
                  />
                )}
              </Circulo>
            </button>
            <Webcam
              audio={false}
              width={700}
              height={600}
              ref={webcamRef}

              screenshotFormat="image/png"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default CameraComponent;
