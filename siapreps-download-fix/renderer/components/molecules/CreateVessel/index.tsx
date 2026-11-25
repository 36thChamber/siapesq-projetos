import React, { useEffect } from "react";
import Button from "../../atoms/button/button";
import Input from "../../atoms/input/input";
import Link from "next/link";
import H1 from "../../atoms/h1";
import Head from "next/head";
import Message from "../../atoms/message";
import { Div, DivWrapper, FluentIosArrow, Frame, Group, Group2, Index, Messagestyles, OverlapGroupWrapper } from "./styles";
import { set } from "date-fns";

type Props = {
  handlePost: () => void,
  errorMessage: string,
  nome: string,
  rgp: string,
  tamanho: string,
  capacidade: string,
  velP: string,
  velC: string,
  modalidade: string,
  area: string,
  onNome: (nome: string) => void,
  onRgp: (rgp: string) => void,
  onTamanho: (tam: string) => void,
  onCapacidade: (cap: string) => void,
  onVelP: (velp: string) => void,
  onVelC: (velc: string) => void,
  onModalidade: (mod: string) => void,
  onArea: (area: string) => void
}

function CadEmbarcacao(props: Props) {

  const [openMessage, setOpenMessage] = React.useState(false);

  useEffect(() => {
    if (props.errorMessage) {
      setOpenMessage(true);
      setTimeout(() => {
        setOpenMessage(false);
      }, 5000);
    }
  }, [props.errorMessage]);

  return (
    <>
      <Index>
        <Head>
          <title>SIAPESQ - Criar Embarcação</title>
        </Head>
        <Div>
          <Messagestyles>
            {props.errorMessage && openMessage && (
              <Message text={props.errorMessage} fontColor={"red"} fontSize={"12"}></Message>
            )}
          </Messagestyles>
          <Group>
            <Frame>
              <Input
                type="text"
                placeholder="Nome"
                value={props.nome}
                name="nome"
                onChange={(e) => props.onNome(e.target.value)}
              />

              <Input
                type="text"
                placeholder="RGP"
                value={props.rgp}
                name="rgp"
                onChange={(e) => props.onRgp(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Tamanho"
                value={props.tamanho}
                name="tamanho"
                onChange={(e) => props.onTamanho(e.target.value)}
              />

              <Input
                type="text"
                placeholder="Capacidade"
                value={props.capacidade}
                name="capacidade"
                onChange={(e) => props.onCapacidade(e.target.value)}
              />

              <Input
                type="text"
                placeholder="Velocidade de pesca"
                value={props.velP}
                name="velocidadePesca"
                onChange={(e) => props.onVelP(e.target.value)}
              />

              <Input
                type="text"
                placeholder="Velocidade de cruzeiro"
                value={props.velC}
                name="velocidadeCruzeiro"
                onChange={(e) => props.onVelC(e.target.value)}
              />

              <Input
                type="text"
                placeholder="Modalidade de pesca"
                value={props.modalidade}
                name="modalidadePesca"
                onChange={(e) => props.onModalidade(e.target.value)}
              />

              <Input
                type="text"
                placeholder="Área de pesca"
                value={props.area}
                name="areaPesca"
                onChange={(e) => props.onArea(e.target.value)}
              />
            </Frame>
          </Group>
          <Group2>
            <H1>Criar Embarcação</H1>
          </Group2>
          <OverlapGroupWrapper>
            <Button
              fontcolor={"#ffffff"}
              backgroundcolor={"#2d81af"}
              width={103}
              left={18} text="Criar"
              onClick={props.handlePost}>
            </Button>
          </OverlapGroupWrapper>
          <DivWrapper>

            <Link href="/home">
              <FluentIosArrow>
                <img
                  width={24}
                  height={24}
                  src="images/back.png"
                />
              </FluentIosArrow>
            </Link>
          </DivWrapper>
        </Div>
      </Index>
    </>
  )
}

export default CadEmbarcacao;