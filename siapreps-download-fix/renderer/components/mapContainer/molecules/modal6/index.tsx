import ModalAvisos from "../../atoms/modalAvisos";
import H2 from "../../atoms/h2";
import Image from "next/image";

type Props = {
    functionModal6: () => void;
};

function Modal6(props: Props) {
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
                        onClick={props.functionModal6}
                    >
                        <Image
                            src={require("../../../assets/image/x.png")}
                            width={20}
                            height={20} alt={""}                        />
                    </button>
                </div>
                <div style={{ marginLeft: "15.5em", marginTop: "-1.5em" }}>
                    <Image src={require("../../../assets/image/atencaoPeq.png")} alt={""} />
                </div>
                <H2 fontSize={"21px"} text={"Atenção !"} left={"9.7em"} />
                <br />
                <H2
                    fontSize={"21px"}
                    text={"Ocorreu um erro e os dados dos lances "}
                    left={"2em"}
                />
                <br />
                <H2
                    fontSize={"21px"}
                    text={"não foram salvos !!"}
                    left={"7em"}
                />
            </ModalAvisos>
        </>
    );
}

export default Modal6;