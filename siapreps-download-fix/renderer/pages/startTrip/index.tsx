import React, { useEffect, useState } from "react";
import Router, { useRouter } from 'next/router';
import { Container, DivStyles, Overlap, Group, OverlapGroup, Overlap2, Overlap3, Overlap4, OverlapGroupWrapper, Overlap5, Group4, Overlap6, Rectangle4, Group5, OverlapGroup4, TextWrapper3, TextWrapper4, TextWrapper5, Group6, Group7, Img, LogoImg, } from "../../resources/styles/startTrip/styles";
import Image from "next/image";
import Link from "next/link";

import { getIdEmbarcacoes } from "../../controllers/embarcacao";
import { getIdArtes } from "../../controllers/artesDePesca";
import { conexaoDaApi } from "../../resources/conexaoDaApi";
import { getIdEspecie } from "../../controllers/especies";
import { getIdPorto } from "../../controllers/portos";

import Logo from "../../components/assets/image/SIAPESQ-LOGO.png";
import ButtonWhite from "../../components/atoms/button/buttonWhite";
import SelectDropdown from "../../components/atoms/selectDropdown";
import Button from "../../components/atoms/button/button";
import Div from "../../components/mapContainer/atoms/div";
import H2 from "../../components/mapContainer/atoms/h2";
import GlobalFonts from "../../components/assets/font/font";
import { styled as st } from "styled-components";
import { checarConexaoInternet } from "../../resources/checarInternet";


function startTrip() {

  const router = useRouter();

  //Impede que avançe sem carregar os dados de especies e, consequentemente, os outros.
  useEffect(() => {
    if (!global?.window?.localStorage.getItem('Especies')) {

      router.push('/home?error=Erro ao carregar dados de embarcação. Tente novamente.');
    }
  }, [router]);

  const [datesEmbarcacao, setDatesEmbarcacao] = useState([]);
  const [datesPortos, setDatesPortos] = useState([]);
  const [datesEspecies, setDatesEspecies] = useState([]);
  const [datesArtes, setDatesArtes] = useState([]);
  const [dateEmbarcacaoId, setDateEmbarcacaoId] = useState([]);
  const [datePortoId, setDatePortoId] = useState([]);
  const [dateArteId, setDateArteId] = useState([]);
  const [dateEspecieId, setDateEspecieId] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  //UseEffect que trás os dados do global?.window?.localStorage para os dropdowns
  useEffect(() => {
    const loadEmbarcacao = () => {
      const embarcacoes = JSON.parse(global?.window?.localStorage.getItem("Embarcacoes") || '[]')
      if (embarcacoes) {
        const nomeEmbarcacao = embarcacoes.map((embarcacao) => ({
          id: embarcacao.id,
          nome: embarcacao.nome,
        }));
        setDatesEmbarcacao(nomeEmbarcacao);
      } else {
        setDatesEmbarcacao([])
      }
    }

    const loadPortos = () => {
      const portos = JSON.parse(global?.window?.localStorage.getItem("Portos") || '[]')
      if (portos) {
        const nomePorto = portos.map((porto) => ({
          id: porto.id,
          nome: porto.nome,
        }));
        setDatesPortos(nomePorto);
      } else {
        setDatesPortos([])
      }
    }

    const loadEspecies = () => {
      const especies = JSON.parse(global?.window?.localStorage.getItem("Especies") || '[]')
      if (especies) {
        const nomeEspecie = especies.map((especie) => ({
          id: especie.id,
          nome: especie.nome,
        }));
        setDatesEspecies(nomeEspecie);
      } else {
        setDatesEspecies([])
      }
    }

    const loadArtes = () => {
      const artes = JSON.parse(global?.window?.localStorage.getItem("Artes") || '[]')
      if (artes) {
        const nomeArte = artes.map((arte) => ({
          id: arte.id,
          nome: arte.nome,
        }));
        setDatesArtes(nomeArte);
      } else {
        setDatesArtes([]);
      }
    }

    loadEmbarcacao()
    loadEspecies()
    loadPortos()
    loadEspecies()
    loadArtes()
  }, []);

  const [conexaoResult, setConexaoResult] = useState(false);
  const [temInternet, setTemInternet] = useState(true)
  useEffect(() => {
    let conectada
    const fetchData = async () => {
      try {
        const result = await conexaoDaApi();
        const internet = await checarConexaoInternet();
        setTemInternet(internet);
        setConexaoResult(result);
      } catch (error) {
        // Lida com o erro, se necessário
        console.error("Erro ao obter dados da API:", error);
      }
    };

    fetchData();
  }, []);

  const dropEmbarcacao = (selectedOption: { label: string; value: string } | null) => {
    if (selectedOption) {
      if (temInternet && conexaoResult) {
        const id = parseInt(selectedOption.value);
        getIdEmbarcacoes(id).then((dates) => {
          setDateEmbarcacaoId(dates);
        });
      } else {
        const embarcacoes = JSON.parse(global?.window?.localStorage.getItem("Embarcacoes") || '[]');
        embarcacoes.forEach((obj) => {
          if (obj.id == selectedOption.value) {
            setDateEmbarcacaoId(obj)
          }
        })
      };
    }
  };

  const dropPorto = (selectedOption: { label: string; value: string } | null) => {
    if (selectedOption) {
      if (temInternet && conexaoResult) {
        const id = parseInt(selectedOption.value);
        getIdPorto(id).then((dates) => {
          setDatePortoId(dates);
        });
      } else {
        const portos = JSON.parse(global?.window?.localStorage.getItem("Portos") || '[]')
        portos.forEach((obj) => {
          if (obj.id == selectedOption.value) {
            setDatePortoId(obj);
          }
        });
      };

    }
  };

  const dropArte = (selectedOption: { label: string; value: string } | null) => {
    if (selectedOption) {
      if (temInternet && conexaoResult) {
        const id = parseInt(selectedOption.value);
        getIdArtes(id).then((dates) => {
          setDateArteId(dates);
        });
      } else {
        const artes = JSON.parse(global?.window?.localStorage.getItem("Artes") || '[]')
        artes.forEach((obj) => {
          if (obj.id == selectedOption.value) {
            setDateArteId(obj);
          }
        })
      }
    }
  };

  const dropEspecie = (selectedOption: { label: string; value: string } | null) => {
    if (selectedOption) {
      if (temInternet && conexaoResult) {
        const id = parseInt(selectedOption.value);
        getIdEspecie(id).then((dates) => {
          setDateEspecieId(dates);
        });
      } else {
        const especies = JSON.parse(global?.window?.localStorage.getItem("Especies") || '[]');
        especies.forEach((obj) => {
          if (obj.id == selectedOption.value) {
            setDateEspecieId(obj);
          }
        })
      }
    }
  };


  const formattedDate = new Date();

  const handleTrip = () => {
    if (dateEmbarcacaoId.length === 0 || datePortoId.length === 0 || dateArteId.length === 0 || dateEspecieId.length === 0) {
      setMostrarModal(true)
    } else {
      try {
        const dados = { dateEmbarcacaoId, datePortoId, dateArteId, dateEspecieId, formattedDate }
        if (dados) {
          global?.window?.localStorage.setItem('Dados', JSON.stringify(dados))

          Router.push('/loadingPage')
        }
      } catch (error) {
        console.log("Erro: ", error)
      }

    }
  };

  const fechar = () => {
    setMostrarModal(false)
  }

  return (
    <Container1>
      <GlobalFonts />

      <Container>
        <DivStyles>
          <Overlap>
            <Group>
              <OverlapGroup>
                <SelectDropdown
                  data={datesEmbarcacao}
                  onChange={(selectedOption) => dropEmbarcacao(selectedOption)}
                  title="Selecione a embarcação"
                  width="328px"
                />
              </OverlapGroup>
            </Group>
          </Overlap>
          <Overlap2>
            <Group>
              <SelectDropdown
                data={datesEspecies}
                onChange={(selectedOption) => dropEspecie(selectedOption)}
                title="Selecione o espécie alvo"
                width="328px"

              />
            </Group>
          </Overlap2>
          <Overlap3>
            <Group>
              <OverlapGroup>
                <SelectDropdown
                  data={datesArtes}
                  onChange={(selectedOption) => dropArte(selectedOption)}
                  title="Tipo de pesca"
                  width="328px"

                />


              </OverlapGroup>
            </Group>
          </Overlap3>
          <Overlap4>
            <OverlapGroupWrapper>
              <OverlapGroup>

                <SelectDropdown
                  data={datesPortos}
                  onChange={(selectedOption) => dropPorto(selectedOption)}
                  title="Saída porto"
                  width="165px"

                />
              </OverlapGroup>
            </OverlapGroupWrapper>
          </Overlap4>
          <Overlap5>
            <Group4>
              <Overlap6>
                <Rectangle4 />
                <Group5>
                  <OverlapGroup4>
                    <TextWrapper4>Data de saída</TextWrapper4>
                  </OverlapGroup4>
                </Group5>
              </Overlap6>
            </Group4>
            <TextWrapper5>{new Date(formattedDate).toLocaleDateString('pt-BR').toString()}</TextWrapper5>
          </Overlap5>
          <Group6>
            <Button
              fontcolor={"#ffffff"}
              backgroundcolor={"#2d81af"}
              width={100}
              left={-15}
              onClick={handleTrip}
              text="Iniciar Pesca"
            ></Button>
          </Group6>
          <Group7>
            <Link href="/home" style={{ textDecoration: 'none' }}>
              <ButtonWhite
                fontcolor={"#2d81af"}
                backgroundcolor={"white"}
                width={100}
                left={-15}
                text="Voltar"
              ></ButtonWhite>
            </Link>
          </Group7>

          <LogoImg>
            <Img src={Logo.src} />
          </LogoImg>
        </DivStyles>
      </Container>
      {mostrarModal && (
        <>
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
                <Image src={require("../../components/assets/image/x.png")} alt="Close" />
              </button>

            </div>
            <H2 fontSize={"23px"} text={"ATENÇÃO!"} left={'8.1em'} top={'-2.3em'} />
            <div style={{ marginLeft: '11.5em', marginTop: '0em' }}>
              <Image src={require("../../components/assets/image/atencaoPeq.png")} alt="Atenção" />
            </div>
            <H2 fontSize={"23px"} text={"Selecione todas as opções"} left={'4.3em'} top={'0.5em'} />
            <br />
            <H2 fontSize={"23px"} text={"para continuar!"} left={'7em'} top={'0.5em'} />
          </Div></>
      )}
    </Container1>
  );
}
const Container1 = st.div`
display: flex;
justify-content: center;
align-items: center;
height: 90vh; 
`;
export default startTrip;
