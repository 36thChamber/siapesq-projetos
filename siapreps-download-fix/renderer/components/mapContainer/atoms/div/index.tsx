import { ReactNode } from 'react'; 
import styled from "styled-components";

type Propriety = {
    height?: string | number,
    width?: string | number,
    borderradius?: string | number,
    top?: string | number,
    backgroundcolor?: string | number,
    left?: string | number,
    right?: string | number,
    bottom?:string

}

export const DivStyle = styled.div<Propriety> `
    background-color: ${props => props.backgroundcolor || 'rgba(20,26,34,0.75)'};
    font-family: "Poppins-Bold";
    z-index: 1000;
    position: absolute;
    box-sizing: content-box;
    bottom: ${props => (typeof props.bottom === "number" || props.bottom === "string" ? `${props.bottom}%` : props.bottom)};
    right: ${props => (typeof props.right === "number" || props.right === "string" ? `${props.right}%` : props.right)};
    left: ${props => (typeof props.left === "number" || props.left === "string" ? `${props.left}%` : props.left)};
    top: ${props => (typeof props.top === "number" ? `${props.top}%` : props.top)};
    height: ${props => (typeof props.height === "number" ? `${props.height}%` : props.height)};
    width: ${props => (typeof props.width === "number" ? `${props.width}%` : props.width)};
    border-radius: ${props => props.borderradius};
`;

type props ={
    height?: string | number,
    width?: string | number,
    borderradius?: string | number,
    top?: string | number,
    left?: string | number,
    text?: string,
    right?: string | number,
    backgroundcolor?: string | number,
    children?: ReactNode,
    bottom?:string
    onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void,
    onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void,
}

function Div(props: props) {
    return (
        <DivStyle {...props}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}>
            {props.children}
        </DivStyle>
    )
}
export default Div;
