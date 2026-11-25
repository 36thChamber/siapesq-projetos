import ButtonMap from "../../atoms/button";
import Div from "../../atoms/div";
import H2 from "../../atoms/h2";
import { TableIncidentesEm } from "../../../atoms/tableIncidentaisEm";
import { TableIncidentaisEs } from "../../../atoms/tableIncidentaisEs";

type Props = {
    lancamentos: number,
    voltarInc: () => void,
    adicionarOutro: () => void,
    tipoDeArte: string,
    cabecalho: string[],
    cabEm: string[],
    cabAux: string[],
    dadosEs: string[][],
    dadosEm: string[][]
}

function TelaIncidentais(props: Props) {
    return (
        <>
            <Div
                width={"80%"}
                height={"96%"}
                borderradius={"20px"}
                top={"2%"}
                left={"18%"}
            >
                <H2 fontSize={"21px"} text={`Capturas incidentais - Lance ${props.lancamentos}`} left={'2%'} />

                <ButtonMap
                    bordercolor={"#2D81AF"}
                    borderradius={"10px"}
                    backgroundcolor={"#2D81AF"}
                    width={"15%"}
                    height={'30px'}
                    margintop={'3%'}
                    marginleft={'42%'}
                    text={"Voltar"}
                    onClick={props.voltarInc}
                />

                <ButtonMap
                    bordercolor={"#2D81AF"}
                    borderradius={"10px"}
                    backgroundcolor={"#2D81AF"}
                    width={"25%"}
                    height={'30px'}
                    margintop={'1%'}
                    marginleft={'2%'}
                    text={"Adicionar outro"}
                    onClick={props.adicionarOutro}
                />
                {props.tipoDeArte == 'espinhel' ? (
                    <TableIncidentaisEs
                        border={'1px solid #333333'}
                        marginleft={'15%'}
                        margintop={'2%'}
                        width={'70%'}
                        columns={0}
                        headers={['Espécie', 'Vivos', 'Mortos']}
                        headersAux={[]}
                        data={props.dadosEs} isca={[]} fundo={[]}                    />)
                    :
                    (
                        <TableIncidentesEm
                            border={'1px solid #333333'}
                            marginleft={'15%'}
                            margintop={'2%'}
                            width={'70%'}
                            columns={0}
                            headers={props.cabEm}
                            data={props.dadosEm} isca={[]} fundo={[]} />
                    )
                }

            </Div>
        </>
    )
}

export default TelaIncidentais;