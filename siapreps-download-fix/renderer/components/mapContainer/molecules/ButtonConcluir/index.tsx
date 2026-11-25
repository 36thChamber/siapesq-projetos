import DivButton from "../../atoms/divButton";
import H2 from "../../atoms/h2";

type Props = {
  concluirMissao: () => void;
  disabled?: boolean;
};

function ButtonConcluir(props: Props) {
  return (
    <>
      <DivButton
        width={"185px"}
        height={"50px"}
        borderradius={"15px"}
        bottom={"25px"}
        left={"10px"}
        backgroundcolor={"#FF2F2F"}
        onClick={props.concluirMissao}
        disabled={props.disabled}
      >
        <H2
          fontSize={"20px"}
          text={"Concluir missão"}
          top={"2px"}
        />
      </DivButton>
    </>
  );
}

export default ButtonConcluir;
