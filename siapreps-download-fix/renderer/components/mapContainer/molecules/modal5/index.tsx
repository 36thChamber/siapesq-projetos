import ModalAvisos from "../../atoms/modalAvisos";
import H2 from "../../atoms/h2";
import Image from "next/image";

type Props = {
    functionModal5: () => void;
};

function Modal5(props: Props) {
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
                        onClick={props.functionModal5}
                    >
                        <Image
                            src={require("../../../assets/image/x.png")}
                            width={20}
                            height={20} alt={""}                        />
                    </button>
                </div>
                <div style={{ marginLeft: "15.5em", marginTop: "-1.5em" }}>
                    <Image src={require("../../../assets/image/confirmaPeq.png")} alt={""} />
                </div>
                <H2
                    fontSize={"21px"}
                    text={"Dados dos lances foram salvos com sucesso!"}
                    left={"0.5em"}
                />
            </ModalAvisos>
        </>
    );
}

export default Modal5;