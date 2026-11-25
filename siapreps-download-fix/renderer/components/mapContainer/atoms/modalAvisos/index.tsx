import { ReactNode } from 'react'; 
import styled from "styled-components";


 const ModalAvisosStyle = styled.div `
    background-color: rgba(20,26,34,0.75);
    font-family: "Poppins-Bold";
    z-index: 1000;
    position: absolute;
    box-sizing: content-box;
    width: 520px;
    height: 330px;
    border-radius: 12px;
    top: 140px;
    left: 440px;
`;

type props ={
    children?: ReactNode
}

function ModalAvisos(props: props) {
    return (
        <ModalAvisosStyle {...props}>
            {props.children}
        </ModalAvisosStyle>
    )
}
export default ModalAvisos;
