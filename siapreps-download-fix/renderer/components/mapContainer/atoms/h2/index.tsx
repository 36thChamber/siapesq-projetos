// H2.tsx
// styles.ts
import styled from 'styled-components';

type Propriety = {
  fontSize: string | number,
  left?: number | string,
  right?: number | string,
  bottom?: number | string,
  top?: number | string,
  opacity?: number,
  color?: string
};

const H2Style = styled.span<Propriety>`
  opacity:${(props) => props.opacity ? props.opacity : 1};
  font-weight: 700;
  color: ${(props) => props.color ? props.color : '#fff'};
  font-family: "Poppins-Bold";
  font-size: ${(props) => props.fontSize};
  position: relative;
  left: ${(props) => props.left};
  right: ${(props) => props.right};
  bottom: ${(props) => props.bottom};
  top: ${(props) => (typeof props.top === 'number' ? `${props.top}px` : props.top)};
  opacity: 0.75;

`;

type Props = {
  fontSize: string | number,
  text: string,
  left?: number | string,
  right?: number | string,
  bottom?: number | string,
  top?: number | string,
  opacity?: number,
  color?: string
};

function H2(props: Props) {
  return <H2Style {...props}>{props.text}</H2Style>;
}

export default H2;
