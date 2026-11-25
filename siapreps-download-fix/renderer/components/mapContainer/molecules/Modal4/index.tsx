import ModalAvisos from "../../atoms/modalAvisos";
import H2 from "../../atoms/h2";
import Image from "next/image";

type Props = {
  functionModal4: () => void;
};

function Modal4(props: Props) {
  return (
    <>
      <ModalAvisos>
        <div style={{ marginBottom: "1.2em", marginLeft: "14em" }}>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginTop: "1.5em",
              display: "block",
              marginLeft: "83%",
            }}
            onClick={props.functionModal4}
          >
            <Image
              src={require("../../../assets/image/x.png")}
              width={20}
              height={20} alt={""}            />
          </button>
        </div>
        <div style={{ marginLeft: "15.5em", marginTop: "-1.5em" }}>
          <Image src={require("../../../assets/image/confirmaPeq.png")} alt={""} />
        </div>
        <H2 fontSize={"21px"} text={"Oops!"} left={"10.7em"} />
        <br />
        <H2
          fontSize={"21px"}
          text={"Preencha todos os campos antes de salvar"}
          left={"2em"}
        />
      </ModalAvisos>
    </>
  );
}

export default Modal4;
