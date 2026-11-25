import H2 from "../../atoms/h2";
import ModalAvisos from "../../atoms/modalAvisos";
import Image from "next/image";

function Modal2({setMostrarModal2}) {
    return (
        <>
            <ModalAvisos>
                <div style={{ marginBottom: "4.2em", marginLeft: "14em" }}>
                    <button
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            marginTop: "1.5em",
                            display: "block",
                            marginLeft: "83%",
                        }}
                        onClick={()=> {setMostrarModal2(false)}}
                    >
                        <Image
                            src={require("../../../assets/image/x.png")}
                            width={20}
                            height={20} alt={""} />
                    </button>
                </div>
                <div style={{ marginLeft: "15.5em", marginTop: "-1.5em" }}>
                    <Image src={require("../../../assets/image/atencaoPeq.png")} alt={""} />
                </div>
                <H2 fontSize={"21px"} text={"Finalize os lances para"} left={"5.5em"} />
                <br />
                <H2
                    fontSize={"21px"}
                    text={"concluir a missão!"}
                    left={"6.6em"}
                />

            </ModalAvisos>
        </>
    )
}

export default Modal2;