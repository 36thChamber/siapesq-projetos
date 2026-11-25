import { forwardRef, ReactNode, useEffect, useRef } from "react";
import styled from "styled-components";

type Propriety = {
  height?: string | number;
  width?: string | number;
  borderradius?: string | number;
  top?: string | number;
  bottom?: string | number;
  backgroundcolor?: string | number;
  left?: string | number;
  right?: string | number;
  disabled?: boolean;
};

export const DivStyle = styled.button<Propriety>`
  background-color: ${(props) =>
    props.backgroundcolor || "rgba(20,26,34,0.75)"};
  font-family: "Poppins-Bold";
  z-index: 1000;
  position: absolute;
  box-sizing: content-box;
  left: ${(props) =>
    typeof props.left === "number" || props.left === "string"
      ? `${props.left}%`
      : props.left};
  right: ${(props) =>
    typeof props.right === "number" || props.right === "string"
      ? `${props.right}%`
      : props.right};
  top: ${(props) =>
    typeof props.top === "number" ? `${props.top}%` : props.top};
  bottom: ${(props) =>
    typeof props.bottom === "number" ? `${props.bottom}%` : props.bottom};
  height: ${(props) =>
    typeof props.height === "number" ? `${props.height}%` : props.height};
  width: ${(props) =>
    typeof props.width === "number" ? `${props.width}%` : props.width};
  border: none;
  border-radius: ${(props) => props.borderradius};
  cursor: pointer;
  cursor: ${(props) => (props.disabled ? "allowed" : "pointer")};
`;

type props = {
  height?: string | number;
  width?: string | number;
  borderradius?: string | number;
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
  text?: string;
  backgroundcolor?: string | number;
  onClick?: () => void;
  children?: ReactNode;
  disabled?: boolean;
  ref?: React.MutableRefObject<null>;
};

const DivButton = forwardRef<HTMLDivElement, props>((props: props) => {
  return (
    <div ref={props.ref}>
      <DivStyle {...props}>{props.children}</DivStyle>;
    </div>
  );
});
export default DivButton;
