import react, { useState } from "react";
import H1 from "../h1";
import Image from "next/image";
import styled from "styled-components";

const ClosePopUpStyle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;

  width: 500px;
  min-height: 350px;
  padding: 20px;
  border-radius: 20px;
  background-color: rgba(20, 26, 34, 0.75);

  position: fixed; /* melhor que absolute nesse caso */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  z-index: 2000;

  text-align: center;

  & > div {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 10px 0;
    width: 100%;
  }

  & h1 {
    color: #fff;
    font-family: "Poppins-Bold";
    font-size: 1.3rem;
    line-height: 1.5;
    max-width: 85%;
  }

  button {
    width: 120px;
    padding: 10px;
    margin: 0 8px;
    border-radius: 8px;
    border: none;
    color: white;
    font-size: 1rem;
    font-weight: bold;
    background-color: #3c8535;
    box-shadow: 3px 2px 5px rgb(0 0 0 / 40%);
    cursor: pointer;
    transition: transform 0.2s ease, background-color 0.2s ease;

    &:hover {
      transform: scale(1.05);
      background-color: #2f6c2a;
    }
  }

  & .redButton {
    background-color: #ff2f2f;

    &:hover {
      background-color: #d62626;
    }
  }
`;


export default function ClosePopUp({ stateWindow }) {
  return (
    <ClosePopUpStyle>
      <div>
        <Image
          src={"/images/warnIcon.png"}
          alt="icone de perigo"
          width={70}
          height={70}
        ></Image>
      </div>
      <div>
        <h1>Ao sair você perdera os lances em andamento. Tem certeza que deseja fechar?</h1>
      </div>
      <div>
        <button className="redButton" onClick={() => stateWindow(false)}>
          Cancelar
        </button>
        <button onClick={() => stateWindow(true)}>Fechar</button>
      </div>
    </ClosePopUpStyle>
  );
}
