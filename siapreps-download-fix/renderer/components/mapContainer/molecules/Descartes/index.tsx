import ButtonMap from "../../atoms/button";
import Div from "../../atoms/div";
import H2 from "../../atoms/h2";
import SelectDropdown from "../../atoms/selectDropdown";
import { TableDescartesEs } from "../../../atoms/tableDescartesEs";

type Props = {
  lancamentos: number,
  voltarInc: () => void,
  adicionarOutro: () => void,
  especies: any[],
  dadosEs: string[][],
  onChange: (selectedOption: any) => void

}

function TelaDescarte(props: Props) {
  return (
    <>
      <Div
        width={"80%"}
        height={"96%"}
        borderradius={"20px"}
        top={"2%"}
        left={"18%"}
      >
        <H2 fontSize={"21px"} text={`Dados de descartes - Lance ${props.lancamentos}`} left={'2%'} />

        <ButtonMap
          bordercolor={"#2D81AF"}
          borderradius={"10px"}
          backgroundcolor={"#2D81AF"}
          width={"15%"}
          height={'30px'}
          margintop={'2%'}
          marginleft={'45%'}
          text={"Voltar"}
          onClick={props.voltarInc}
        />

        <ButtonMap
          bordercolor={"#2D81AF"}
          borderradius={"10px"}
          backgroundcolor={"#2D81AF"}
          width={"25%"}
          height={'30px'}
          marginleft={'28px'}
          margintop={'2%'}
          text={"Adicionar"}
          onClick={props.adicionarOutro}
        />
        <SelectDropdown
          data={props.especies}
          onChange={props.onChange}
          title={""}
          width="22em"
          borderRadius="10px"
          marginLeft="28px"
          marginTop="15px"
        ></SelectDropdown>



        <TableDescartesEs
          border={'1px solid #333333'}
          marginleft={'15%'}
          margintop={'2%'}
          width={'70%'}
          columns={0}
          headers={['N°do identificador', 'Espécie', 'N° de vivos', 'N°de mortos']}
          headersAux={[]}
          data={props.dadosEs} isca={[]} fundo={[]}        />
      </Div>
    </>
  )
}

export default TelaDescarte;