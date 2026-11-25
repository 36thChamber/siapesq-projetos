import Head from 'next/head';
import Link from "next/link";
import styled from './styled.module.css';
import Button from "../../atoms/button/button";
import ButtonWhite from "../../atoms/button/buttonWhite";
import H1 from "../../atoms/h1";
import Input from "../../atoms/input/input";
import Message from "../../atoms/message";
import Logo from "../../../components/assets/image/SIAPESQ-LOGO.png";
import { Div, DivWrapper, Group, Group2, GroupWrapper, Index, LogoContainer, LogoImage, MessageStyles, OverlapGroupWrapper, OverlapWrapper } from './styles';
import {esqueciSenha} from '../../../controllers/esqueceuSenha';
import { useState } from 'react';
import EsqueceuSenha from '../ModalEsqueceuSenha'


type Props = {
    errorMessage: string,
    emailAlert: string,
    senhaAlert: string,
    email: string,
    password: string,
    handleLogin: () => void,
    onEmail: (email: string) => void,
    onSenha: (senha: string) => void
}

function TelaLogin(props: Props) {
    const [modal1, setModal1] = useState(false)
    const handleCloseModal1 = () => {
        setModal1(false); // Função para fechar o modal 1
    };
    return (
        <>
            <Index>
                <Head>
                    <title>Login - SIAPESQ </title>
                </Head>
                <GroupWrapper>
                    <Group> 
                        <LogoContainer>
                            <LogoImage src={Logo.src} alt="SIAPESQ Logo" />
                        </LogoContainer>
                        <Div>
                            <H1>Seja bem-vindo</H1>
                            <MessageStyles>
                                <Message text={props.errorMessage} fontColor="red" fontSize="12px"></Message>
                            </MessageStyles>
                            <OverlapGroupWrapper>
                                <Input type="email" placeholder="Email"
                                    value={props.email}
                                    name="email"
                                    onChange={(e) => props.onEmail(e.target.value)} backgroundcolor={'#fff'} bordercolor={props.emailAlert || '#000000'} />
                            </OverlapGroupWrapper>
                            <OverlapWrapper>
                                <Input type="password" placeholder="Senha"
                                    value={props.password}
                                    name="password"
                                    onChange={(e) => props.onSenha(e.target.value)} backgroundcolor={'#fff'} bordercolor={props.senhaAlert || '#000000'} />
                            </OverlapWrapper>
                            <DivWrapper>
                                <Button
                                    fontcolor={"#ffffff"}
                                    backgroundcolor={"#2d81af"}
                                    width={100}
                                    left={18}
                                    text="Entrar"
                                    onClick={props.handleLogin}
                                ></Button>
                            </DivWrapper>
                            <Link href="/register">
                                <Group2>


                                    <ButtonWhite
                                        fontcolor={"#2d81af"}
                                        backgroundcolor={"white"}
                                        width={100}
                                        left={18}
                                        text="Criar Conta"
                                    ></ButtonWhite>

                                </Group2>
                            </Link>
                            <div style={{marginTop: '110px'}}>
                                <button onClick={() => {
                                    setModal1(true)
                                }}
                                style={{border: 'none', all: 'unset', cursor: 'pointer', textDecorationLine: 'underline'}}
                                >
                                    Esqueci minha senha
                                </button>
                            </div>

                            {modal1 && (
                                <EsqueceuSenha show={modal1} handleClose={handleCloseModal1} />
                            )}
                        </Div>
                       
                    </Group>

                </GroupWrapper>
            </Index>
        </>
    )
}

export default TelaLogin;