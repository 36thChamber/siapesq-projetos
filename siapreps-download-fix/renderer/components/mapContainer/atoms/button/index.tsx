
import React, { MouseEventHandler } from 'react';

import styled from "styled-components";

type ButtonProps = {
  width?: string | number;
  height?: string | number;
  backgroundcolor?: string;
  bordercolor?: string;
  borderradius?: string | number;
  marginleft?: string | number;
  marginright?: string | number,
  margintop?: string | number;
};

type TextProps = {
  color?: string;
  fontSize?: string | number;
};

const defaultColor = "#2d81af";

 const ButtonText = styled.span<TextProps>`
  color: ${(props) => props.color || '#fff' };
  font-family: "Poppins-Bold";
  font-size: ${(props) => props.fontSize || "18px"};
  left: 16%;
  top: 12px;
`;

 const ButtonStyle = styled.button<ButtonProps>`
  height: ${(props) => props.height || "43px"};
  border-radius: ${(props) => props.borderradius};
  width: ${(props) => props.width};
  background-color: ${(props) => props.backgroundcolor};
  border-color: ${(props) => props.bordercolor};
  margin-left: ${(props) => props.marginleft};
  margin-right: ${(props) => props.marginright};
  margin-top: ${(props) => props.margintop};
  cursor: pointer;
`;

type props = {
  width?: string | number,
  height?: string | number,
  fontSize?:string | number,
  marginleft?: string | number,
  marginright?: string | number,
  margintop?: string | number,
  onClick?: MouseEventHandler<HTMLButtonElement>,
  text: string,  
  backgroundcolor?: string,
  borderradius?: string | number,
  bordercolor?: string,
  color?:string,
  children?: React.ReactNode;
}

  function ButtonMap(props:props) {
  return (
        <ButtonStyle  {...props} onClick={props.onClick} >
             <ButtonText color={props.color} fontSize={props.fontSize}>{props.text}</ButtonText>
        </ButtonStyle>
  );
}

export default ButtonMap;
