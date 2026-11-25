import Div from "../../atoms/div";
import H2 from "../../atoms/h2";
import { TableDate } from "../../../atoms/tableDate";
import ButtonMap from "../../atoms/button";

type Props = {
  cabTabela: string[];
  tipoDeArte: string;
  dataPetrecho: String[][];
  cancelar: () => void;
  salvar: () => void;
  adicionarEspecie: () => void;
  isca: { id: string; nome: string }[];
  fundo: { id: string; nome: string }[];
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

function TableLances(props: Props) {
  const {
    cabTabela,
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
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
      >
        {/* AQUI O COMPONENTE DA TABELA */}

        <H2
          fontSize={"21px"}
          text={"DADOS DE ESFORÇO"}
          top={"15px"}
          left={"5%"}
        />

        <TableDate
          width={"90%"}
          margintop={"3%"}
          border={"1px solid #333333"}
          columns={6}
          headers={cabTabela}
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
            paddingTop: "10px",
    
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

export default TableLances;
