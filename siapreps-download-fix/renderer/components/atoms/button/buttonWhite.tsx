import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';

type ButtonProps = {
  width?: string | number,
  backgroundcolor?: string,
}

type TextProps = {
  fontcolor?: string,
  left?: string | number,
}

const defaultColor = '#2d81af';

const ButtonText = styled.span<TextProps>`
  color: ${props => props.fontcolor || '#fff'};
  font-family: 'Poppins-Bold';
  font-size: 16px;
  letter-spacing: 0;
  line-height: normal;
  text-decoration: none;
`;

const Buttonwhite = styled.button<ButtonProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  border-color: #2d81af;
  border-radius: 10px;
  position: relative;
  height: 47px;
  background-color: ${props => props.backgroundcolor || defaultColor};
  width: ${props => typeof props.width === 'string' ? props.width : `${props.width}%`};
  margin-bottom: 20px;
  &:hover {
    cursor: pointer;
    border-color: #000000;
    font-size: 18px;
    background-color: aliceblue;
    border-radius: 13px;
  }
  &:hover ${ButtonText} {
    font-size: 17px;
  }
`;

type Props = {
  width?: string | number,
  left?: string | number,
  onClick?: MouseEventHandler<HTMLButtonElement>,
  text: string,
  backgroundcolor?: string,
  fontcolor?: string,
}

function ButtonWhite(props: Props) {
  return (
    <Buttonwhite {...props}>
      <ButtonText fontcolor={props.fontcolor || '#000'} left={props.left} >{props.text}</ButtonText> {/* texto preto */}
    </Buttonwhite>
  );
}

export default ButtonWhite;
