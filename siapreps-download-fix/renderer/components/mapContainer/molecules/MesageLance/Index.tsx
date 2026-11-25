import Div from "../../atoms/div";
import H2 from "../../atoms/h2";

type Props = {
  lancamentos: number
}

function MesageLance(props: Props) {
  return (
    <>
      <Div
        width={'180px'}
        height={"40px"}
        borderradius={"10px"}
        top={"75px"}
        right={"4%"}
        backgroundcolor={'#141a2289'}
      >
        <H2
          fontSize={"12px"}
          text={`${props.lancamentos}° lance  em andamento`}
          left={"15px"}
          top={"10.5px"}
          opacity={0.85}
          color={'#ffe607'}
        />
      </Div>
    </>
  )
}

export default MesageLance;