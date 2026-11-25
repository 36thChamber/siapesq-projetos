import H2 from "../../atoms/h2";
import Div from "../../atoms/div";
import Circulo from "../../atoms/divCirculo";
import Image from "next/image";

type Props = {
  nomeEspecie: string,
  desativaEspecie: boolean,
  onClick: () => void
}

function EspecieAlvo(props: Props) {
  return (
    <>
      <Div
        width={'310px'}
        height={"50px"}
        borderradius={"10px"}
        top={"15px"}
        left={"250px"}
      >
        <H2
          fontSize={"13px"}
          text={`Missão espécie-alvo: ${props.nomeEspecie}`}
          left={"4%"}
          top={"15px"}
        />
        <button
          style={{ background: "none", border: "none", cursor: "pointer", marginLeft: '20em', marginTop: '-0.65em' }}
          onClick={() => { props.onClick() }}
          disabled={props.desativaEspecie}
        >
          <Circulo>
            <Image src={require("../../../assets/image/ciclo.png")} alt={""} />
          </Circulo>
        </button>
      </Div>
    </>
  )
}

export default EspecieAlvo