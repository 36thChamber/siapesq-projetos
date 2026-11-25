import DivButton from "../../atoms/divButton"
import H2 from "../../atoms/h2"

type Props = {
  handleRecolher: () => void
}

function ButtonRecolher(props: Props) {
  return (
    <>
      <DivButton
        width={"250px"}
        height={"53px"}
        borderradius={"35px"}
        top={"90vh"}
        left={"43vw"}
        onClick={props.handleRecolher}
      >
        <H2
          fontSize={"20px"}
          text={"Recolher"}
          left={"2px"}
          top={"2px"}
        />
      </DivButton>
    </>
  )
}

export default ButtonRecolher