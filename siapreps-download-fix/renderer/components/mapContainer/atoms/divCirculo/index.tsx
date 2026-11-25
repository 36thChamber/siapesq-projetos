import React, { ReactNode } from "react";
import styled from "styled-components";

type Propriety = {
    backgroundcolor?: string | number,
    margintop?: string | number,
    marginleft?: string | number,
    marginbottom?: string | number
}

export const CirculoStyle = styled.div<Propriety>`
    width: 27px;
    height: 27px;
    position: relative;
    background-color: ${props => props.backgroundcolor};
    border-radius: 50%;
    margin-top: ${(props) => (typeof props.margintop === 'number' ? `${props.margintop}px` : props.margintop)};
    margin-left: ${(props) => (typeof props.marginleft === 'number' ? `${props.marginleft}px` : props.marginleft)};
    margin-bottom: ${(props) => (typeof props.marginbottom === 'number' ? `${props.marginbottom}px` : props.marginbottom)};
`;

type props = {
    backgroundcolor?: string | number,
    margintop?: string | number,
    marginleft?: string | number,
    marginbottom?: string | number,
    children?: ReactNode
  }

const Circulo: React.FC<props> = (props) => {
  return (
    <CirculoStyle {...props}>
    </CirculoStyle>
  );
};

export default Circulo;
