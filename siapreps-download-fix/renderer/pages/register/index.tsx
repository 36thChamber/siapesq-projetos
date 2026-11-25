import React, { useState, useEffect } from 'react';
import { rota_register } from "../../controllers/login";
import H1 from "../../components/atoms/h1/index";
import Div from '../../components/mapContainer/atoms/div';
import H2 from '../../components/mapContainer/atoms/h2';
import Image from "next/image";
import Router from 'next/router'
import GlobalFonts from '../../components/assets/font/font';
import TelaRegistro from '../../components/molecules/Register';
import styled from "styled-components";
import ButtonMap from '../../components/mapContainer/atoms/button';
import { enviarEmailDeVerificacao } from '../../controllers/verificarEmail';

//ajustar pagina automaticamente; tamanho limite minimo


function Register() {


  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [CNPJ, setCNPJ] = useState('');
  const [inscCaptPortos, setInscCaptPortos] = useState('');
  const [telefone, setTelefone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);


  const handleRegister = async () => {
    const result = await rota_register(
      {
        nome: nome,
        email: email,
        senha: senha,
        administracao: false,
        documento: CNPJ,
        inscCaptPortos: inscCaptPortos,
        telefone: telefone
      }
    );
    if (typeof result === 'boolean') {
      setMostrarModal(result)
    } else {
      setErrorMessage(result);
    }
  };

  return (
    <>
      <GlobalFonts />
      <Container>
        <TelaRegistro
          errorMessage={errorMessage}
          nome={nome}
          CNPJ={CNPJ}
          telefone={telefone}
          inscCaptPortos={inscCaptPortos}
          email={email}
          senha={senha}
          handleRegister={handleRegister}
          onNome={(e) => setNome(e)}
          onCNPJ={(e) => setCNPJ(e)}
          onCap={(e) => setInscCaptPortos(e)}
          onTelefone={(e) => setTelefone(e)}
          onEmail={(e) => setEmail(e)}
          onSenha={(e) => setSenha(e)}
        />

        {mostrarModal && (
          <Div
            width={'502px'}
            height={'350px'}
            top={'150px'}
            left={'400px'}
            backgroundcolor={'rgba(20,26,34,0.95)'}
            borderradius={'10px'}
          >

            <div style={{ marginLeft: '11.5em', marginTop: '4.5em' }}>
              <Image src={require("../../components/assets/image/atencaoPeq.png")} alt={''} />
            </div>
            <H2 fontSize={'17px'} text={'Acesse seu e-mail para verificar o cadastro! '} left={'60px'} top={'10px'}/>

            <ButtonMap
              bordercolor={"#2D81AF"}
              borderradius={"8px"}
              backgroundcolor={"transparent"}
              margintop={"50px"}
              marginleft={"40px"}
              width={"200px"}
              text={"Reenviar"}
              onClick={() => {
                enviarEmailDeVerificacao(email)
              }}
            />
            <ButtonMap
              bordercolor={"#2D81AF"}
              borderradius={"8px"}
              backgroundcolor={"#2D81AF"}
              margintop={"50px"}
              marginleft={"40px"}
              width={"200px"}
              text={"Logar"}
              onClick={() => {Router.push('/login')}}
            />
          </Div>
        )}
      </Container>
    </>
  );


};
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh; 
`;

export default Register;
