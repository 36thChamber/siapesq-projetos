import styled from 'styled-components';

type InputProps = {
  width?: string | number, 
  backgroundcolor?:string|number,
  bordercolor?: string 
}

const InputStyle = styled.input<InputProps>`

font-family: "Poppins-Regular";
font-size:16px;
background-color: ${props => props.backgroundcolor};
border: 1px solid;
border-color: ${props => props.bordercolor};
border-radius: 10px;
height: 45px;
position: relative;
width: 312px;
padding-left: 20px;
`;

type props = {
  width?: string | number,
  placeholder?: string, 
  type: string,
  name?:string,
  value?: string,
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
  backgroundcolor?: string | number,
  bordercolor?: string, 
}

  function Input(props:props) {
  return (
        <InputStyle {...props}  />
  );
}

export default Input;
