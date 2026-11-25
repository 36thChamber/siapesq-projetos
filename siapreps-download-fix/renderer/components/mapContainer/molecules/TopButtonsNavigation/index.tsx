import React from "react";
import Div from "../../atoms/div";
import Circulo from "../../atoms/divCirculo";
import Image from "next/image";
import H2 from "../../atoms/h2";
import CameraComponent from '../../atoms/camera/index'
import DivButton from "../../atoms/divButton";
import ConfirmButton from "../updateImagesModal";
type Props = {
    clicklance: () => void;
    clickMapa: () => void;
    desativa: boolean;
};
function TopButtonsNavigation(props: Props) {
    return (
        <div style={containerStyle}>


            <div>
                <DivButton
                    width={"150px"}
                    height={"40px"}
                    borderradius={"12px"}
                    onClick={props.clicklance}
                    disabled={props.desativa}
                >
                    <Circulo marginleft={"3px"} margintop={"10px"}>
                        <Image src={require("../../../assets/image/lance.png")} alt={""} />
                    </Circulo>
                    <H2
                        fontSize={"13px"}
                        text={"Lances"}
                        left={"10px"}
                        bottom={"27px"}
                    />
                </DivButton>
            </div>
            <div>
                <DivButton
                    width={"150px"}
                    height={"40px"}
                    borderradius={"12px"}
                    onClick={() => { props.clickMapa() }}
                    disabled={props.desativa}
                >
                    <Circulo marginleft={"3px"} margintop={"10px"}>
                        <Image src={require("../../../assets/image/mapa.png")} alt={""} />
                    </Circulo>
                    <H2
                        fontSize={"13px"}
                        text={"Mapa de bordo"}
                        left={"10px"}
                        bottom={"27px"}
                    />
                </DivButton>
            </div>
            <div>
                <CameraComponent desativaBotoes={props.desativa} />
            </div>

        </div>
    );
}
const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column', // Organiza verticalmente
    alignItems: 'center', // Centraliza horizontalmente
    position: 'absolute',
    gap: '40px',
    right: '170px',
    marginTop: '90px'
};

export default TopButtonsNavigation;
