import H2 from "../../atoms/h2";
import Div from "../../atoms/div";
import SelectDropdown from "../../atoms/selectDropdown";
import ButtonMap from "../../atoms/button";
import TableEspecies from "../../atoms/tableEspecies";
import { TableEspinhel } from "../../../atoms/tableEspinhel";
import { TableDescartesEs } from "../../../atoms/tableDescartesEs";

type Props = {
  lancamentos: number,
  tipoDearte: string,
  cabLanceExtras: string[],
  cabEspecieExtras: string[],
  dadosExtras: string[][],
  adicionarEspecieExtra: () => void,
  voltarTabLances: () => void,
  especies: any[],
  tabelaDate: string[][],
  Descartes: () => void,
  Incidentais: () => void,
  mostrarBDescartes: boolean,
  mostrarBIncidentais: boolean,
  onChange: (selectedOption: any) => void
}

function EspeciesExtras(props: Props) {
  return (
    <>
      <Div
        width={"80%"}
        height={"96%"}
        borderradius={"20px"}
        top={"2%"}
        left={"18%"}
      >
        <H2 fontSize={"21px"} text={`Dados de captura do lance ${props.lancamentos}°`} left={'1.5em'} top={'-2em'} />

        <ButtonMap
          bordercolor={"#2D81AF"}
          borderradius={"10px"}
          backgroundcolor={"#2D81AF"}
          width={"15%"}
          height={'30px'}
          marginleft={'-290px'}
          margintop={'60px'}
          text={"Adicionar"}
          onClick={props.adicionarEspecieExtra}
        />

        <ButtonMap
          bordercolor={"#2D81AF"}
          borderradius={"10px"}
          backgroundcolor={"#2D81AF"}
          width={"15%"}
          height={'30px'}
          marginleft={"3em"}
          margintop={'60px'}
          text={"Voltar"}
          onClick={props.voltarTabLances}
        />
        {props.mostrarBDescartes && props.mostrarBIncidentais ? (
          <>
            <ButtonMap
              bordercolor={"#2D81AF"}
              borderradius={"10px"}
              backgroundcolor={"#2D81AF"}
              width={"25%"}
              height={'30px'}
              marginleft={'7em'}
              margintop={'60px'}
              text={"Adicionar descartes"}
              onClick={props.Descartes}
            />
          </>) : (<></>)}

        {props.mostrarBIncidentais ? (
          <>
            <ButtonMap
              bordercolor={"#2D81AF"}
              borderradius={"10px"}
              backgroundcolor={"#2D81AF"}
              width={"25%"}
              height={'30px'}
              marginleft={"1em"}
              margintop={'60px'}
              text={"Adicionar incidentais"}
              onClick={props.Incidentais}
            />
          </>) : (<></>)}

        <SelectDropdown
          data={props.especies}
          onChange={props.onChange}
          title={""}
          width="22em"
          borderRadius="10px"
          marginLeft="28px"
          marginTop="7px"
        ></SelectDropdown>

        {props.tipoDearte == 'espinhel' ?
          <TableDescartesEs
            columns={2}
            headers={['N°do identificador', 'Espécie', 'N°', 'Kg']}
            headersAux={[]}
            data={props.tabelaDate}
            width={'75%'}
            border={'1px solid #333333'}
            margintop={'2%'}
            marginleft={'13%'} isca={[]} fundo={[]}          />
          :
          <TableEspecies columns={2}
            headers={['N°do identificador', 'Espécie', 'Peso(kg)']}
            data={props.tabelaDate}
            width={'75%'}
            border={'1px solid #333333'}
            margintop={'2%'}
            marginleft={'13%'}
          />
        }

      </Div>
    </>
  )
}

export default EspeciesExtras