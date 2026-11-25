import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';

type ButtonProps = {
  width?: string | number,
  backgroundcolor?: string | number,
}

type TextProps = {
  fontcolor?: string,
  left?: string | number,
}

const defaultColor = '#2d81af';

const ButtonText = styled.span<TextProps>`
  color: ${(props) => props.fontcolor};
  font-family: 'Poppins-Bold';
  font-size: 16px;
  left: ${(props) => props.left + '%'};
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 10px;
  width: 200px;
`;

const ButtonStyle = styled.button<ButtonProps>`
  border-color: #2d81af;
  border-radius: 10px;
  height: 47px;
  position: relative;
  background-color: ${(props) => props.backgroundcolor || defaultColor};
  width: ${(props) => props.width + '%'};
  margin-bottom: 20px;
  &:hover {
    cursor: pointer;
    border-color: #000000;
    font-size: 18px;
    background-color: #2d81af;
    border-radius: 13px;
  }
  &:hover ${ButtonText} {
    font-size: 17px;
  }
`;

type ButtonPropsWrapper = {
  width?: string | number,
  left?: string | number,
  onClick?: MouseEventHandler<HTMLButtonElement>,
  text: string,
  backgroundcolor?: string,
  fontcolor?: string,
};

function Button(props: ButtonPropsWrapper) {
  const { text, fontcolor, left, ...buttonProps } = props;
  return (
    <ButtonStyle {...buttonProps} onClick={props.onClick}>
      <ButtonText left={left} fontcolor={fontcolor}>{text}</ButtonText>
    </ButtonStyle>
  );
}

export default Button;
