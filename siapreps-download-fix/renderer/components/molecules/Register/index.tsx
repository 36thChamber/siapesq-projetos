import React from 'react';
import Head from 'next/head';
import Link from 'next/link'
import styled from './styled.module.css';
import Button from '../../atoms/button/button';
import Input from '../../atoms/input/input';
import Message from "../../atoms/message";
import H1 from "../../atoms/h1/index";


type Props = {
  errorMessage: string,
  nome: string,
  CNPJ: string,
  telefone: string,
  inscCaptPortos: string,
  email: string,
  senha: string
  handleRegister: () => void,
  onNome: (nome: string) => void,
  onCNPJ: (cnpj: string) => void,
  onCap: (cap: string) => void,
  onTelefone: (tel: string) => void,
  onEmail: (email: string) => void,
  onSenha: (senha: string) => void

}

function TelaRegistro(props: Props) {
  return (
    <>
      <div className={styled['index']}>
        <Head>
          <title>Register - SIAPESQ</title>
        </Head>
        <div className={styled['div']}>
          <div className={styled['group']}>
            <div className={styled['frame']}>
              <div className={styled['message']}>
                <Message text={props.errorMessage} fontColor={'red'} fontSize={'12px'}></Message>
              </div>
              <div className={styled['overlap-group-wrapper']}>
                <Input type="text" placeholder='Nome'
                  value={props.nome}
                  name="nome"
                  onChange={(e) => props.onNome(e.target.value)} />
              </div>

              <div className={styled['overlap-group-wrapper']}>
                <Input type="text" placeholder='CNPJ'
                  value={props.CNPJ}
                  name="CNPJ"
                  onChange={(e) => props.onCNPJ(e.target.value)} />
              </div>

              <div className={styled['overlap-group-wrapper']}>
                <Input type="text" placeholder='Telefone'
                  value={props.telefone}
                  name="telefone"
                  onChange={(e) => props.onTelefone(e.target.value)} />
              </div>
              <div className={styled['overlap-group-wrapper']}>
                <Input type="text" placeholder='RGP'
                  value={props.inscCaptPortos}
                  name="inscCaptPortos"
                  onChange={(e) => props.onCap(e.target.value)} />
              </div>
              <div className={styled['overlap-group-wrapper']}>
                <Input type="email" placeholder='Email'
                  value={props.email}
                  name="email"
                  onChange={(e) => props.onEmail(e.target.value)}
                />
              </div>

              <div className={styled['overlap-group-wrapper']}>
                <Input type="password" placeholder='Senha'
                  value={props.senha}
                  name="senha"
                  onChange={(e) => props.onSenha(e.target.value)} />
              </div>

              <div className={styled['overlap-group-wrapper']}>
                <Input type="password" placeholder='Confirmar Senha' />
              </div>
            </div>
          </div>
          <div className={styled['overlap-wrapper']}>
            <Button
              fontcolor={"#ffffff"}
              backgroundcolor={"#2d81af"}
              width={100}
              left={18}
              text="Criar Conta"
              onClick={props.handleRegister}
            ></Button>
          </div>
          <div className={styled['group-2']}>

            {/* transformar text-wrapper-6 em um H1 */}
            <H1>Criar conta</H1>
            <Link href="/login">

              <img
                className={styled['fluent-ios-arrow']}
                alt="Fluent iOS arrow"
                src="https://cdn.animaapp.com/projects/651051e6ad252e258624d700/releases/65105261a21151cdc6d00365/img/fluent-ios-arrow-24-filled.svg"
              />

            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default TelaRegistro