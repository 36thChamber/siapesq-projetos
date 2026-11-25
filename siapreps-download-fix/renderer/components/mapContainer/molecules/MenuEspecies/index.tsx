import SelectDropdown from "../../atoms/selectDropdown";
import H2 from "../../atoms/h2";
import Div from "../../atoms/div";
import Circulo from "../../atoms/divCirculo";
import Image from "next/image";

type Props = {
    nomeEspecie: string,
    onClick: () => void,
    especies: any[],
    onChange: (selectedOption: any) => void,

}

function MenuEspecies(props: Props) {
    return (
        <>
            <Div
                width={'310px'}
                height={"210px"}
                borderradius={"10px"}
                top={"15px"}
                left={"250px"}
            >
                <H2
                    fontSize={"13px"}
                    text={`Missão espécie-alvo: ${props.nomeEspecie}`}
                    left={"4%"}
                    top={"1em"}
                />
                <button
                    style={{ background: "none", border: "none", cursor: "pointer", marginLeft: '20em', marginTop: '-0.5em' }}
                    onClick={() => { props.onClick() }}
                >
                    <Circulo>
                        <Image
                            src={require("../../../assets/image/confirmar.png")} alt={""}                        />
                    </Circulo>
                </button>
                <SelectDropdown
                    data={props.especies}
                    onChange={props.onChange}
                    title={""}
                    width="300px"
                    borderRadius="9px"
                ></SelectDropdown>
            </Div>
        </>
    )
}

export default MenuEspecies;