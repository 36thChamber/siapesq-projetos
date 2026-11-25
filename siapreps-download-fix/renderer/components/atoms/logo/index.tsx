
import React from 'react';
import styled from 'styled-components';

type props = {
    src?:string,
    alt?:string
  }
const defaultLogo ='../../../assets/image/SIAPESQ-LOGO.png';

const LogoImg = styled.img<props>`
  src: ${(props) => (props.src ? props.src : defaultLogo)};
  alt: ${(props) => (props.alt ? props.alt : 'Logo')};
`;

function logoImg(props:props) {
    return (
          <LogoImg  {...props}/>
            
    );
}
  

export default logoImg;


