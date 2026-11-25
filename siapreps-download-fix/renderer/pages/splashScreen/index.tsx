import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Logo from '../../components/assets/image/slashscreen.png';
import Router from 'next/router'
import { rota_refresh } from "../../controllers/login";
import { getUserToken } from '../../controllers/cookies';
import { conexaoDaApi } from '../../resources/conexaoDaApi';
import { SplashScreenContainer, LogoImg, Loader } from '../../resources/styles/splashScreen/styles';
import { checarConexaoInternet } from '../../resources/checarInternet';


function SplashScreen() {

  const fetchData = async () => {
    try {
      const apiResult = await conexaoDaApi(); // Aguarda a conexão com a API
      const internetResult = await checarConexaoInternet(); // Verifica a conexão com a internet
      
      return { apiResult, internetResult }; // Retorna ambos resultados
    } catch (error) {
      console.error("Erro ao obter dados da API ou conexão:", error);
      return { apiResult: false, internetResult: false }; // Em caso de erro, retorna falso para ambos
    }
  };

  useEffect(() => {
    const verificarConexao = async () => {
      const { apiResult, internetResult } = await fetchData(); // Espera que o fetchData resolva e pegue os valores diretamente

      const cookies = getUserToken();
      const dadosUserRaw = localStorage.getItem('userData');
      const dadosViagemRaw = localStorage.getItem('Dados');

      const dadosUser = dadosUserRaw ? JSON.parse(dadosUserRaw) : null;
      const dadosViagem = dadosViagemRaw ? JSON.parse(dadosViagemRaw) : [];

      if (internetResult && apiResult && dadosUser) { 
        console.log('0-0- entrou com internet')
        if (cookies) {
          rota_refresh(cookies);
        } else {
          Router.push('/login');
        }
      } else {
        console.log('-=-= entrou sem internet')
        // Verifica se tem token e dados de usuário para manter o login
        if (cookies && dadosUser && dadosViagem.length == 0 ) {
          Router.push('/home');
        } else if (cookies && dadosUser && dadosViagem.length !== 0) { // Verifica login e se já iniciou a viagem
          Router.push('/map');
        } else if (!cookies || !dadosUser) {
          localStorage.clear();
          Router.push('/login');
        }
      }
    };

    verificarConexao(); // Chama a função para verificar a conexão
  }, []);


  return (
      <SplashScreenContainer>
        <Loader/>
        <LogoImg  src={Logo.src}/>
      </SplashScreenContainer>
  );
}

export default SplashScreen;
