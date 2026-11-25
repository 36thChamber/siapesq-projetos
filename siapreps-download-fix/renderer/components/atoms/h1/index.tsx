import styled from 'styled-components';

const H1Style = styled.span`
color: #3e3e3e;
font-family: "Poppins-Bold";
font-size: 26px;
left: 50px;
letter-spacing: 0;
line-height: normal;
position: relative;
top: -10px;
`;
type props = {
  children: string
}

function H1(props: props) {
  return (
    <H1Style>{props.children}</H1Style>
  );
}

export default H1;
