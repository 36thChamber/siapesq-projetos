import { forwardRef } from "react";
import Div from "../../atoms/div";
import Circulo from "../../atoms/divCirculo";
import H2 from "../../atoms/h2";
import { LinearGradient } from "@react-pdf/renderer";

export const TableProbabilidade = forwardRef<HTMLDivElement, {}>(() => {
  return (
    <Div
      width={"200px"}
      height={"260px"}
      borderradius="10px"
      top="230px"
      left={"10px"}
    >
      <H2
        fontSize={"12px"}
        text={"PROBABILIDADE"}
        left={"7%"}
        top={"15px"}
      />
      <div
        style={{
          marginTop: 30,
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#2D81AF"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Muito baixa"} left={"7%"} />
      </div>
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#174F6D"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Baixa"} left={"7%"} />
      </div>
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#3C8535"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Média"} left={"7%"} />
      </div>
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#FFA928"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Alta"} left={"7%"} />
      </div>
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#FF2F2F"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Muito alta"} left={"7%"} />
      </div>
    </Div>
  )
})


export function TableProbabilidadeXerelete() {
  return (
    <Div
      width={"200px"}
      height={"230px"}
      borderradius="10px"
      top="250px"
      left={"1em"}
    >
      <H2
        fontSize={"12px"}
        text={"PROBABILIDADE"}
        left={"7%"}
        top={"15px"}
      />
      <div
        style={{
          marginTop: 30,
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#174F6D"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Muito baixa"} left={"7%"} />
      </div>
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#3C8535"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Baixa"} left={"7%"} />
      </div>
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#FFA928"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Média"} left={"7%"} />
      </div>
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Circulo backgroundcolor={"#FF2F2F"} marginleft={"6%"} />
        <H2 fontSize={"17px"} text={"Alta"} left={"7%"} />
      </div>
    </Div>
  )
}

export function TabelaTemperatura(){
  return (
    <div style={
      {
        display: 'flex',
        flexFlow: 'column nowrap',
        alignItems: 'center',
        backgroundColor: 'rgba(20,26,34,0.85)',
        position: 'absolute',
        top: '250px',
        left: '1em',
        width: '190px',
        height: '55px',
        fontFamily: "Poppins-Bold",
        zIndex: '1000',
        boxSizing: 'content-box',
        padding: '5px',
        borderRadius: '5px',
        opacity: '0.80'
      }
    }>
      <div style={
        {
          width: '100%',
          height: '50px',
          background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
          marginBottom: '10px',
        }
      }></div>
      <H2 fontSize={"14px"} text="Temperatura"/>
    </div>
  );
}

export function TabelaSalinidade(){
  return (
    <div style={
      {
        display: 'flex',
        flexFlow: 'column nowrap',
        alignItems: 'center',
        backgroundColor: 'rgba(20,26,34,0.85)',
        position: 'absolute',
        top: '250px',
        left: '1em',
        width: '190px',
        height: '55px',
        fontFamily: "Poppins-Bold",
        zIndex: '1000',
        boxSizing: 'content-box',
        padding: '5px',
        borderRadius: '5px',
        opacity: '0.80'
      }
    }>
      <div style={
        {
          width: '100%',
          height: '50px',
          background: 'linear-gradient(to right, #800080, #008080, #00ff00, #ffff00)',
          marginBottom: '10px',
        }
      }></div>
      <H2 fontSize={"14px"} text="Salinidade"/>
    </div>
  );
}

export function  TabelaClorofilla () {
  return (
    <div style={
      {
        display: 'flex',
        flexFlow: 'column nowrap',
        alignItems: 'center',
        backgroundColor: 'rgba(20,26,34,0.85)',
        position: 'absolute',
        top: '250px',
        left: '1em',
        width: '190px',
        height: '55px',
        fontFamily: "Poppins-Bold",
        zIndex: '1000',
        boxSizing: 'content-box',
        padding: '5px',
        borderRadius: '5px',
        opacity: '0.80'
      }
    }>
      <div style={
        {
          width: '100%',
          height: '50px',
          background: 'linear-gradient(to left, #000000, #008000, #00ff80, #ffffff)',
          marginBottom: '10px',
        }
      }></div>
      <H2 fontSize={"14px"} text="Clorofila"/>
    </div>
  );
}

export function TabelaProfundidade () {
  return (
    <div style={
      {
        display: 'flex',
        flexFlow: 'column nowrap',
        alignItems: 'center',
        backgroundColor: 'rgba(20,26,34,0.85)',
        position: 'absolute',
        top: '250px',
        left: '1em',
        width: '190px',
        height: '55px',
        fontFamily: "Poppins-Bold",
        zIndex: '1000',
        boxSizing: 'content-box',
        padding: '5px',
        borderRadius: '5px',
        opacity: '0.80'
      }
    }>
      <div style={
        {
          width: '100%',
          height: '50px',
          background: 'linear-gradient(to left, #000000, #404060, #8080a0, #c0c0e0, #ffffff)',
          marginBottom: '10px',
        }
      }></div>
      <H2 fontSize={"14px"} text="Profundidade"/>
    </div>
  );
}