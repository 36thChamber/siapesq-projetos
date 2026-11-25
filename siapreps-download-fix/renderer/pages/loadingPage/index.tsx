import ButtonMap from "../../components/mapContainer/atoms/button";
import Logo from '../../components/assets/image/SIAPESQ-LOGO.png';
import { get_all_pngs } from '../../controllers/downloadPng';
import GlobalFonts from "../../components/assets/font/font";
import { Loader, LogoImg, SplashScreen } from "../../resources/styles/loadingPage/styles";
import H2 from "../../components/mapContainer/atoms/h2";
import React, { useEffect, useState } from "react";
import styled from 'styled-components'
import Router from 'next/router'
import Store from 'electron-store';
import { checarConexaoInternet } from "../../resources/checarInternet";

const store = new Store();

function loadingPage() {
    const [aviso, setAviso] = useState(false);
    const [button, setButton] = useState(false);

    const [adm, setAdm] = useState(false);
    const [antigo, setAntigo] = useState<any>();

    const [progress, setProgress] = useState(0); // Estado para o progresso do download
    const [isLoading, setIsLoading] = useState(true);

    const formatarData = (data) => {
        const date = new Date(data);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    useEffect(() => {
        const interval = setInterval(() => {
            let date = localStorage.getItem('thunnus_obesus.tif');
            if (date !== null && date !== '') {
                let dataFormatada = new Date(date);
                setAntigo(dataFormatada);
                localStorage.setItem('thunnus_obesus.tif', '');
            }

            const userDataString = global.window.localStorage.getItem('userData');
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                if (userData.administracao) {
                    setAdm(true);
                }
            }
        }, 1000); // Verifica a cada segundo

        return () => clearInterval(interval);  // Limpa o intervalo quando o componente desmonta
    }, []);



    useEffect(() => {
        const interval = setInterval(() => {
            let date = localStorage.getItem('thunnus_obesus.tif');
            if (date !== null && date !== '') {
                let dataFormatada = new Date(date);
                setAntigo(dataFormatada);
                localStorage.setItem('thunnus_obesus.tif', '');
            }

            const userDataString = global.window.localStorage.getItem('userData');
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                if (userData.administracao) {
                    setAdm(true);
                }
            }
        }, 1000); // Verifica a cada segundo

        return () => clearInterval(interval);  // Limpa o intervalo quando o componente desmonta
    }, []);


    useEffect(() => {
        const verificarConexao = async () => {
            const isOnline = await checarConexaoInternet();
      
            if (isOnline) {
                get_all_pngs((completed, total) => {
                    setIsLoading(true)
                    setProgress((completed / total) * 100);  
                    

                  }).then((result) => {
                    if (result) { Router.push('/map'); } else {
                      setTimeout(() => {
                        setAviso(true);
                      }, 5000);
                      setTimeout(() => {
                        setAviso(false);
                        setButton(true);
                      }, 10000);
                    }
                  });
            }else {
                setIsLoading(true)
                setTimeout(() => {
                    setAviso(true);
                }, 5000);
                setTimeout(() => {
                    setAviso(false);
                    setButton(true);
                }, 10000);
            }
        };
      
        verificarConexao();
    }, [])

    return (

        <SplashScreen>
            <GlobalFonts />
            <Loader />
            <LogoImg src={Logo.src} />

            {isLoading && (
                <>
                    <div style={{width: '350px'}}>
                    <p style={{fontFamily: 'Poppins-bold', color: '#233263'}} >Progresso: {progress.toFixed(0)}%</p>
                        <div style={{ width: '100%', backgroundColor: '#ccc', height: '20px', borderRadius: '10px' }}>
                            <div
                            style={{
                                width: `${progress}%`,
                                backgroundColor: '#81BB58',
                                height: '100%',
                                borderRadius: '10px',
                                transition: 'width 0.2s ease'
                            }}
                            />
                        </div>
                    </div>
                </>
            )}

            {aviso && (
                <H2 text={"Não foi possível atualizar todos os mapas. Verifique a conexão e a disponibilidade dos TIFFs."} fontSize={""} left={'30px'} color={"black"} top={"10px"}></H2>
            )}
            {adm && (
                <H2 text={`Último TIF baixado: ${antigo}`} fontSize={""} left={'30px'} color={"black"} top={"30px"}></H2>
            )}
            {button && (
                <>
                    <H2 text={"Alguns mapas não foram atualizados. Os arquivos locais anteriores foram preservados."} fontSize={""} left={'30px'} color={"black"} top={"10px"}></H2>
                    <H2 text={"Deseja prosseguir sem atualização dos mapas de predição dos peixes?"}
                        fontSize={""}
                        left={'30px'}
                        color={"black"}
                        top={"20px"}>
                    </H2>

                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        padding: "0px 40px 40px 40px",
                        marginLeft: "45px",
                        marginTop: '30px'
                    }}>
                        <ButtonMap
                            text={"Sim"}
                            color={"white"}
                            width={"180px"}
                            marginright={"100px"}
                            backgroundcolor={"#2d81af"}
                            borderradius={"10px"} bordercolor={"#2d81af"}
                            onClick={() => { Router.push('/map') }}>
                        </ButtonMap>

                        <ButtonMap text={"Não"} color={"#2d81af"}
                            width={"180px"} backgroundcolor={"#ffffff"}
                            borderradius={"10px"} bordercolor={"#2d81af"}
                            onClick={() => { Router.push('/home') }}></ButtonMap>
                    </div>

                </>
            )}
        </SplashScreen>
    );
}
export default loadingPage;
