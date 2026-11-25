import React from 'react';
import styled from 'styled-components';

type Props = {
  text?: string | null;
  fontColor: string;
  fontSize: string;
};

const StyledDiv = styled.div<Props>`
  color: ${(props) => props.fontColor};
  font-size: ${(props) => props.fontSize}; 
  font-family: "Poppins-Bold"; 
`;

function Message(props: Props) {
  const { text, fontColor, fontSize } = props;

  return (
    <StyledDiv fontColor={fontColor} fontSize={fontSize}>
      {text && <div>{text}</div>}
    </StyledDiv>
  );
}

export default Message;
