import styled from "./styled.module.css";
import Button from "../../atoms/button/button";
import ButtonWhite from "../../atoms/button/buttonWhite";
import Logo from '../../../assets/image/SIAPESQ-LOGO.jpg';
import Link from "next/link";
import Head from "next/head";
import { LogoContainer, LogoImage } from "./styles";

type Props = {
  openWindow: () => void
}

function IniciarPesca(props: Props) {
  return (
    <>
      <Head>
        <title>SIAPESQ - Home</title>
      </Head>
      <Button fontcolor={'#ffffff'} backgroundcolor={'#2d81af'} width={100} left={18} onClick={props.openWindow} text="Iniciar Pesca"></Button>
      <Link href="/createVessel">
        <ButtonWhite fontcolor={'#2d81af'} backgroundcolor={'white'} width={100} left={18} text="Cadastro Embarcação"></ButtonWhite>
      </Link>
      <Link href="/createCrew">
        <ButtonWhite fontcolor={'#2d81af'} backgroundcolor={'white'} width={100} left={18} text="Cadastro Tripulante"></ButtonWhite>
      </Link>
      <Link href="/historicMap">
        <ButtonWhite fontcolor={'#2d81af'} backgroundcolor={'white'} width={100} left={18} text="Histórico de mapa de bordo"></ButtonWhite>
      </Link>
      <Link href="/login">
        {/* arrumar hover/criar elemento logout  */}
        <ButtonWhite fontcolor={'black'} backgroundcolor={'rgb(255, 70, 70)'} width={100} left={18} text="Sair da sua Conta"></ButtonWhite>
      </Link>
      <LogoContainer>
        <LogoImage src={Logo.src} alt="SIAPESQ Logo" />
      </LogoContainer>
      
    </>
  )
}

export default IniciarPesca;