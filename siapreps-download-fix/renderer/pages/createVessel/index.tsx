import React, { useState } from "react";

import { postEmbarcacao } from '../../controllers/embarcacao';
import { conexaoDaApi } from "../../resources/conexaoDaApi";
import Div from "../../components/mapContainer/atoms/div";
import H2 from "../../components/mapContainer/atoms/h2";
import Image from "next/image";
import Router from 'next/router';
import GlobalFonts from "../../components/assets/font/font";
import CadEmbarcacao from "../../components/molecules/CreateVessel";
import styled from "styled-components";
import { checarConexaoInternet } from "../../resources/checarInternet";


function Vessel() {

  const [nome, setNome] = useState('');
  const [rgp, setRgp] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [velocidadePesca, setVelocidadePesca] = useState('');
  const [velocidadeCruzeiro, setVelocidadeCruzeiro] = useState('');
  const [modalidadePesca, setModalidadePesca] = useState('');
  const [areaPesca, setAreaPesca] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModal2, setMostrarModal2] = useState(false);


  const handlePost = async () => {
    if (nome != '' || rgp != '' || tamanho != '' || capacidade != '' || velocidadeCruzeiro != '' || velocidadePesca != '' || modalidadePesca != '' || areaPesca != '') {
      let conectada;
      const internet = await checarConexaoInternet()
      if (internet && await conexaoDaApi()) {
        const id_mestre = JSON.parse(global?.window?.localStorage.getItem('userData') || '[]').id
        const result = await postEmbarcacao({
          nome: nome,
          id_mestre: id_mestre,
          RGP: rgp,
          tamanho: tamanho,
          capacidade_estocagem: Number(capacidade),
          velocidade_pesca: Number(velocidadePesca),
          velocidade_cruzeiro: Number(velocidadeCruzeiro),
          modalidade_pesca: modalidadePesca,
          area_pesca: areaPesca,
          imagem: null
        })
        if (typeof result === 'boolean') {
          setMostrarModal(result)
        } else {
          setErrorMessage(result)
        }

      } else {
        setErrorMessage("Sem conexão com a internet para realizar o cadastro!!")
      }
    } else {
      setMostrarModal2(true);
    }
  }

  const fechar = () => {
    Router.push("/home");
  }

  const cadastrar = () => {
    setMostrarModal2(false)
  }
  return (
    <>
      <GlobalFonts />
      <Container>
        <CadEmbarcacao
          handlePost={handlePost}
          errorMessage={errorMessage}
          nome={nome}
          rgp={rgp}
          tamanho={tamanho}
          capacidade={capacidade}
          velP={velocidadePesca}
          velC={velocidadeCruzeiro}
          modalidade={modalidadePesca}
          area={areaPesca}
          onNome={(e) => setNome(e)}
          onRgp={(e) => setRgp(e)}
          onTamanho={(e) => setTamanho(e)}
          onCapacidade={(e) => setCapacidade(e)}
          onVelP={(e) => setVelocidadePesca(e)}
          onVelC={(e) => setVelocidadeCruzeiro(e)}
          onModalidade={(e) => setModalidadePesca(e)}
          onArea={(e) => setAreaPesca(e)}
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
            <div style={{ marginBottom: '1.2em', marginLeft: '14em' }}>
              <button style={{ background: "none", border: "none", cursor: "pointer", marginTop: '1.5em', display: 'block', marginLeft: '78%' }} onClick={fechar}>
                <Image src={require("../../components/assets/image/x.png")} alt={""} />
              </button>

            </div>
            <H2 fontSize={"23px"} text={"ATENÇÃO!"} left={'8.1em'} top={'-2.3em'} />
            <div style={{ marginLeft: '11.5em', marginTop: '-1em' }}>
              <Image src={require("../../components/assets/image/confirmaPeq.png")} alt={""} />
            </div>
            <H2 fontSize={"23px"} text={"Embarcação cadastrada"} left={'4.5em'} top={'0.5em'} />
            <br />
            <H2 fontSize={"23px"} text={"com sucesso!"} left={'7.4em'} top={'0.5em'} />
          </Div>
        )}
        {mostrarModal2 && (
          <Div
            width={'502px'}
            height={'350px'}
            top={'150px'}
            left={'400px'}
            backgroundcolor={'rgba(20,26,34,0.95)'}
            borderradius={'10px'}
          >
            <div style={{ marginBottom: '1.2em', marginLeft: '14em' }}>
              <button style={{ background: "none", border: "none", cursor: "pointer", marginTop: '1.5em', display: 'block', marginLeft: '78%' }} onClick={cadastrar}>
                <Image src={require("../../components/assets/image/x.png")} alt={""} />
              </button>

            </div>
            <H2 fontSize={"23px"} text={"ATENÇÃO!"} left={'8.1em'} top={'-2.3em'} />
            <div style={{ marginLeft: '11.5em', marginTop: '-1em' }}>
              <Image src={require("../../components/assets/image/confirmaPeq.png")} alt={""} />
            </div>
            <H2 fontSize={"23px"} text={"Preencha todos os dados"} left={'4.5em'} top={'0.5em'} />
            <br />
            <H2 fontSize={"23px"} text={"para cadastrar a embarcação!"} left={'3em'} top={'0.5em'} />
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
height: 40vh; 
`;
export default Vessel;