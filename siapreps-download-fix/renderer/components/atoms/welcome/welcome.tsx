import styled from "styled-components";

export const Styles = styled.div `
fontFamily: "Poppins-Bold",
color: '#3F3F3F',
fontSize: '24px',
fontWeight: '700'
`;


function H1() {
  return (
      <Styles>
        <div>
            Seja bem vindo!
        </div>
      </Styles>  
  );
}

export default H1;
