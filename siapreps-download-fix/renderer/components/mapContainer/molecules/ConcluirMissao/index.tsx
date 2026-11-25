import H2 from "../../atoms/h2";
import Div from "../../atoms/div";
import ButtonMap from "../../atoms/button";
import SelectDropdown from "../../atoms/selectDropdown";
import Input from "../../../atoms/input/input";
import { useState } from "react";

type Props = {
  nomePortos: any[];
  onChange: (selectedOption: any) => void;
  altura: string;
  alt: (selectedOption: any) => void;
  comp: (selectedOption: any) => void;
  compS: string;
  voltarMissao: () => void;
  missaoConcluida: () => void;
  tipoDeArte: string;
   onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

function ConcluirMissao(props: Props) {
  return (
    <>
      <Div
        width={"350px"}
        height={props.tipoDeArte === "cerco" ? "430px" : "300px"}
        borderradius={"10px"}
        top={"140px"}
        left={"40%"}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
      >
        <H2
          fontSize={"14px"}
          text={"Selecione o porto de chegada"}
          left={"5%"}
          top={"1.5em"}
        />

        <SelectDropdown
          data={props.nomePortos}
          onChange={props.onChange}
          title={""}
          width="310px"
          height="45px"
          marginTop="23px"
          borderRadius="9px"
        ></SelectDropdown>
        {props.tipoDeArte == "cerco" ? (
          <>
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                justifyContent: "space-between",

                height: "150px",
              }}
            >
              <div
                style={{ marginLeft: "5%", top: "2em", position: "relative" }}
              >
                <H2
                  fontSize={"13px"}
                  text={"Comprimento da rede (m)"}
                  left={"4%"}
                />
                <input
                  type="text"
                  placeholder="Comprimento da rede"
                  value={props.compS}
                  name="nome"
                  onChange={(e) => {
                    props.comp(e.target.value);
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    width: "94%", // Pode ajustar a largura conforme necessário
                    marginRight: "1%",
                    boxSizing: "border-box", // Para garantir que o tamanho inclua padding e border
                  }}
                />
              </div>
              <div
                style={{ marginLeft: "5%", top: "2em", position: "relative" }}
              >
                <H2 fontSize={"13px"} text={"Altura da rede (m)"} left={"4%"} />
                <input
                  type="text"
                  placeholder="Altura da rede"
                  value={props.altura}
                  name="nome"
                  onChange={(e) => {
                    props.alt(e.target.value);
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    width: "94%", // Pode ajustar a largura conforme necessário
                    marginRight: "1%",
                    boxSizing: "border-box", // Para garantir que o tamanho inclua padding e border
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <></>
        )}
        <ButtonMap
          text={"Voltar"}
          bordercolor={"#D12525"}
          borderradius={"8px"}
          backgroundcolor={"#D12525"}
          marginleft={"78px"}
          margintop={"120px"}
          onClick={props.voltarMissao}
        />
        <ButtonMap
          text={"Concluir"}
          bordercolor={"#2D81AF"}
          borderradius={"8px"}
          backgroundcolor={"#2D81AF"}
          marginleft={"30px"}
          onClick={props.missaoConcluida}
        />
      </Div>
    </>
  );
}

export default ConcluirMissao;
