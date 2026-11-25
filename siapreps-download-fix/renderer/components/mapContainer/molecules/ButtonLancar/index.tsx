import DivButton from "../../atoms/divButton";
import H2 from "../../atoms/h2";

type Props = {
  onClick: () => void,
  desativaLancar?: boolean
}

function ButtonLancar(props: Props) {
  return (
    <>
      <DivButton
        width={"250px"}
        height={"53px"}
        borderradius={"15px"}
        bottom={"25px"}
        left={"43vw"}
        disabled={props.desativaLancar}
        onClick={props.onClick}
      >
        <H2
          fontSize={"20px"}
          text={"Lançar petrecho"}

        />
      </DivButton>
    </>
  )
}

export default ButtonLancar;