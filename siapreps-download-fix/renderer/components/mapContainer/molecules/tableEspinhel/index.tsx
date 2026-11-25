import Div from "../../atoms/div";
import H2 from "../../atoms/h2";
import ButtonMap from "../../atoms/button";
import { TableEspinhel } from "../../../atoms/tableEspinhel";

type Props = {
  cabTabela: string[];
  cabEspinhel: string[];
  dataPetrecho: String[][];
  cancelar: () => void;
  salvar: () => void;
  adicionarEspecie: () => void;
  isca: { id: string; nome: string }[];
  fundo: { id: string; nome: string }[];
};

function TableDateEspinhel(props: Props) {
  const {
    cabTabela,
    cabEspinhel,
    dataPetrecho,
    cancelar,
    salvar,
    adicionarEspecie,
    isca,
    fundo,
  } = props;

  return (
    <>
      <Div
        width={"auto"}
        height={"98%"}
        borderradius={"10px"}
        top={"2%"}
        right={"1%"}
        bottom={"2%"}
      >
        {/* AQUI O COMPONENTE DA TABELA */}
        <H2
          fontSize={"21px"}
          text={"DADOS DE ESFORÇO"}
          top={"5px"}
          left={"5%"}
        />
        <TableEspinhel
          width={"90%"}
          margintop={"1%"}
          marginleft={"5%"}
          border={"1px solid #333333"}
          columns={6}
          headers={cabTabela}
          headersAux={cabEspinhel}
          data={dataPetrecho}
          isca={isca}
          fundo={fundo}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "space-between",
            width: "90%",
            margin: "0 auto",
            paddingTop: "8px",
          }}
        >
          <ButtonMap
            bordercolor={"#3C8535"}
            borderradius={"8px"}
            backgroundcolor={"#3C8535"}
            width={"30%"}
            text={"Adicionar Capturas"}
            fontSize={"12px"}
            onClick={adicionarEspecie}
          />

          <ButtonMap
            bordercolor={"#2D81AF"}
            borderradius={"8px"}
            backgroundcolor={"#2D81AF"}
            width={"30%"}
            text={"Salvar"}
            onClick={salvar}
          />

          <ButtonMap
            bordercolor={"#FF2F2F"}
            borderradius={"8px"}
            backgroundcolor={"#FF2F2F"}
            width={"30%"}
            text={"Cancelar"}
            onClick={cancelar}
          />
        </div>
      </Div>
    </>
  );
}

export default TableDateEspinhel;
