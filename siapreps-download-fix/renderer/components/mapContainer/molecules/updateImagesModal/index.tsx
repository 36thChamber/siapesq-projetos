import React, { useState, forwardRef, useRef, useEffect  } from "react";
import Router from "next/router";
import Image from "next/image";
import styled from "styled-components";
import DivButton from "../../atoms/divButton";
import Circulo from "../../atoms/divCirculo";

// Estilos para o modal personalizado
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: rgba(20,26,34,0.75);
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  padding: 20px;
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
`;

const ModalTitle = styled.h5`
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
  font-size: 1.25rem;
`;

const ModalBody = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.75);
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  gap: 10px;
`;

const Button = styled.button<{ variant?: string }>`
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  background-color: ${({ variant }) =>
    variant === "secondary" ? "#6c757d" : "#007bff"};
  color: white;
  &:hover {
    background-color: ${({ variant }) =>
      variant === "secondary" ? "#5a6268" : "#0056b3"};
  }
`;

interface IConfirmButton {
  ref?: React.Ref<HTMLDivElement>;
}

const ConfirmButton = forwardRef<HTMLDivElement, IConfirmButton>((props, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [desativaConfig, setDesativaConfig] = useState(false);

  const handleConfirm = () => {
    setShowModal(false);
    Router.push("/loadingPage");
  };

  return (
    <>
      <div>
        <DivButton
          width={"180px"}
          height={"40px"}
          borderradius={"12px"}
          top={"15px"}
          right={"10px"}
          backgroundcolor={"rgba(20,26,34,0.75)"}
          disabled={desativaConfig}
          onClick={() => setShowModal(true)}
        >
          <p
            style={{
              padding: 0,
              marginLeft: "24px",
              marginTop: "5px",
              color: "rgba(255,255,255,0.75)",
              fontSize: "16px",
              textAlign: "center",
            }}
            ref={ref}
          >
            Atualizar mapas
          </p>

          <Circulo marginleft="5px" margintop="-38px">
            <Image
              src={require("../../../../components/assets/image/atualizar.png")}
              alt=""
            />
          </Circulo>
        </DivButton>
      </div>

      {showModal && (
        <Overlay>
          <ModalContainer>
            <ModalHeader>
              <ModalTitle>Confirmação</ModalTitle>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </ModalHeader>
            <ModalBody>
              Tem certeza que deseja atualizar as imagens de satélite?
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirm}>
                Confirmar
              </Button>
            </ModalFooter>
          </ModalContainer>
        </Overlay>
      )}
    </>
  );
});

export default ConfirmButton;
