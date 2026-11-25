import Div from "../../atoms/div";
import Circulo from "../../atoms/divCirculo";
import H2 from "../../atoms/h2";
import TableMaps from "../../atoms/tableMaps";
import Image from "next/image";

type Props = {
  onClick: () => void;
  mapasDeBordo: string[][];
  children?: React.ReactNode;
  baixar?: (inicioLinha: string) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

function HistoricoMapas(props: Props) {
  const { mapasDeBordo } = props;
  return (
    <>
      <Div
        width={"30vw"}
        height={"100vh"}
        left={"70%"}
        top={"0px"}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginLeft: "-6em",
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => {
              props.onClick();
            }}
          >
            <Circulo marginleft={"6.5em"} margintop={"24px"}>
              <Image
                src={require("../../../assets/image/voltar.png")}
                alt={""}
              />
            </Circulo>
          </button>
          <H2 fontSize={"22px"} text={"Mapas de bordo"} top="5px" />
        </div>
        <div style={{ maxHeight: "87vh", overflow: "auto" }}>
          <TableMaps
            columns={4}
            headers={["Número", "Espécie alvo", "Data", "Baixar"]}
            data={mapasDeBordo}
            marginleft={"1.6em"}
            baixar={props.baixar}
            width={"90%"}
          ></TableMaps>
        </div>
      </Div>
    </>
  );
}

export default HistoricoMapas;
