import H2 from "../../atoms/h2";
import ModalAvisos from "../../atoms/modalAvisos";
import Image from "next/image";
import ButtonMap from "../../atoms/button";

type Props = {
  nao: () => void;
  sim: () => void;
};

function Modal3(props: Props) {
  return (
    <>
      <ModalAvisos>
        <H2 fontSize={"27px"} text={"Atenção! "} left={"7em"} top={"0.3em"} />
        <div style={{ marginTop: "18px", marginLeft: "15.5em" }}>
          <Image src={require("../../../assets/image/atencaoPeq.png")} alt={""} />
        </div>

        <H2
          fontSize={"14px"}
          text={"Você não realizou nenhum lance!"}
          left={"9.3em"}
          top={"20px"}
        />
        <br />
        <H2
          fontSize={"14px"}
          text={"Deseja concluir a missão mesmo assim ?"}
          left={"7.3em"}
          top={"20px"}
        />

        <ButtonMap
          bordercolor={"#2D81AF"}
          borderradius={"8px"}
          backgroundcolor={"transparent"}
          margintop={"50px"}
          marginleft={"40px"}
          width={"200px"}
          text={"Não"}
          onClick={props.nao}
        />
        <ButtonMap
          bordercolor={"#2D81AF"}
          borderradius={"8px"}
          backgroundcolor={"#2D81AF"}
          margintop={"50px"}
          marginleft={"30px"}
          width={"200px"}
          text={"Sim"}
          onClick={props.sim}
        />
      </ModalAvisos>
    </>
  );
}

export default Modal3;