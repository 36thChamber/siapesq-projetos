import React, { useState, useEffect } from "react";
import { rota_login } from "../../controllers/login";
import GlobalFonts from "../../components/assets/font/font";
import TelaLogin from "../../components/molecules/Login";
import styled from "styled-components";
import ContactModal from "../../components/molecules/modalContact";
import electron from 'electron';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReenviarEmail from "../../components/molecules/modalReenviar";
import { useElectronLog } from "../../hook/listening_electron";

const ipcRenderer = electron.ipcRenderer;

//ajustar pagina automaticamente; tamanho limite minimo

const Welcome = () => {

  //Função para chamar a rota de login 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailAlert, setEmailAlert] = useState('');
  const [senhaAlert, setSenhaAlert] = useState('');
  const [assinar, setAssinar] = useState(false);
  const [verificarEmail, setVerificarEmail] = useState(false);

  const handleLogin = async () => {
    const result = await rota_login({ email, password });
    if (result === 'sem assinatura') {
      setAssinar(true)
    } else if (result === 'não autenticado') {
      setVerificarEmail(true)
    } else if (result !== undefined) {
      setErrorMessage(result.response.data.message)
    }
  };
  const update = () => {
    ipcRenderer.send('click-update');
  }
  useEffect(() => {
    setTimeout(() => {
      setErrorMessage('');
      setEmailAlert('');
      setSenhaAlert('');
    }
      , 5000);
  }
    , [email, password]);
    
  const [logs, setLogs] = useState<string[]>([]);

  useElectronLog((mensagem) => {
    setLogs((prev) => [...prev, mensagem]);
  });

  console.log('[Tela Login] Retorno dos logs do electron: ', logs)

  return (
    <>
      <GlobalFonts />
      <Container>
        <TelaLogin
          errorMessage={errorMessage}
          emailAlert={emailAlert}
          senhaAlert={senhaAlert}
          email={email}
          password={password}
          handleLogin={handleLogin}
          onEmail={(e) => { setEmail(e) }}
          onSenha={(s) => { setPassword(s) }}
        />
        <button
          onClick={update}
          style={{
            position: 'fixed', /* Mantém o botão fixo na tela */
            bottom: '20px', /* Espaçamento do fundo da tela */
            left: '20px', /* Espaçamento da borda esquerda da tela */
            padding: '10px 20px', /* Espaçamento interno */
            backgroundColor: '#387cc5', /* Cor de fundo */
            color: 'white', /* Cor do texto */
            border: 'none', /* Remove bordas padrão */
            borderRadius: '5px', /* Cantos arredondados */
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', /* Sombra sutil */
            fontSize: '14px', /* Tamanho da fonte */
            cursor: 'pointer', /* Cursor de ponteiro ao passar o mouse */
            transition: 'background-color 0.3s, box-shadow 0.3s', /* Transições suaves */
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3'; /* Cor de fundo ao passar o mouse */
            e.currentTarget.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.2)'; /* Sombra mais intensa ao passar o mouse */
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#007bff'; /* Cor de fundo original */
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; /* Sombra original */
          }}
        >
          Atualizar
        </button>
        <ContactModal show={assinar} handleClose={() => setAssinar(false)} />
        <ReenviarEmail show={verificarEmail} handleClose={() => { setVerificarEmail(false) }} />
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
export default Welcome;
