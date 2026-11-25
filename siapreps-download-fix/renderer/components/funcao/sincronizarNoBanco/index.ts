import { checarConexaoInternet } from "../../../resources/checarInternet";
import { type_sincronizar, types_missao_concluida, DadosPescariaArmadilha, DadosPescariaEspinhel, DadosPescariaCerco, DadosPescariaEmalhar } from "../../types/functions-types";
async function sincronizarDadosNoBanco(sincroniza: type_sincronizar) {
  let conectada;
  const internet = await checarConexaoInternet()
  if (internet && await sincroniza.conexaoDaApi(conectada)) {
    const mapasDeBordo = JSON.parse(localStorage.getItem("mapasDeBordo") || '[]') || {};

    if (mapasDeBordo.length > 0) {
      Object.keys(mapasDeBordo).forEach(async (mapaKey) => {
        interface Dados {
          id_embarcacao: string;
          id_usuario: string;
          id_arte: string;
          nome_armador: string;
          porto_chegada: string;
          porto_saida: string;
          data_chegada: Date;
          data_saida: Date;
          dados_pescaria: (DadosPescariaArmadilha | DadosPescariaEspinhel | DadosPescariaCerco | DadosPescariaEmalhar)[];
        }

        if (mapasDeBordo && mapasDeBordo[mapaKey]) {
          const mapas = mapasDeBordo[mapaKey]
          if (mapas) {
            const dados: Dados = {
              id_embarcacao: mapasDeBordo[mapaKey].lancesMapa.lance1.idEmbarcacao,
              id_usuario: mapasDeBordo[mapaKey].lancesMapa.lance1.idUsuario,
              id_arte: mapasDeBordo[mapaKey].lancesMapa.lance1.idArmadilha,
              nome_armador: mapasDeBordo[mapaKey].lancesMapa.lance1.empresaArmador,
              porto_chegada: mapasDeBordo[mapaKey].lancesMapa.lance1.portoChegada,
              porto_saida: mapasDeBordo[mapaKey].lancesMapa.lance1.portoSaidaId,
              data_chegada: mapasDeBordo[mapaKey].lancesMapa.lance1.dataChegada,
              data_saida: mapasDeBordo[mapaKey].lancesMapa.lance1.dataSaida,
              dados_pescaria: [],
            };
            Object.keys(mapasDeBordo[mapaKey].lancesMapa).forEach((lanceKey) => {
              const lance = mapasDeBordo[mapaKey].lancesMapa[lanceKey];

              //pega a data que foi salva no formato d/m/a e ai deixamos ela no formato padrão de Date
              //fazemos isso para cada lance
              let dataLanceParts
              if (mapasDeBordo[mapaKey].lancesMapa.data && mapasDeBordo[mapaKey].lancesMapa.data) {
                dataLanceParts = lance.dataLance.split("/");

                if (dataLanceParts) {
                  const dataCompleta = new Date(
                    `${dataLanceParts[1]}/${dataLanceParts[0]
                    }/${new Date().getFullYear()}`
                  );

                  //aqui as datas completas depois do tratamento
                  //fizemos assim por conta de ter que mostrar na tela em um formato e salvar em outro
                  const dataCompleta2 = new Date(dataCompleta);
                  const dataCompleta3 = new Date(dataCompleta);

                  if (
                    sincroniza.tipoDeArte == "espinhel" &&
                    lance.horaRecolhimentoR &&
                    lance.horaRecolhimentoR !== "-"
                  ) {
                    dataCompleta2.setHours(lance.horaRecolhimentoR.split(":")[0]);
                    dataCompleta2.setMinutes(lance.horaRecolhimentoR.split(":")[1]);
                    dataCompleta3.setHours(lance.horaLancamentoR.split(":")[0]);
                    dataCompleta3.setMinutes(lance.horaLancamentoR.split(":")[1]);
                  } else {
                    dataCompleta2.setHours(lance.horaRecolhimento.split(":")[0]);
                    dataCompleta2.setMinutes(lance.horaRecolhimento.split(":")[1]);
                    dataCompleta3.setHours(lance.horaLancamento.split(":")[0]);
                    dataCompleta3.setMinutes(lance.horaLancamento.split(":")[1]);
                  }

                  switch (sincroniza.tipoDeArte) {
                    case "armadilha":
                      //armadilha
                      dados.dados_pescaria.push({
                        data: dataCompleta,
                        n_lance_armadilhas: lance.armadilhasLancadas,
                        n_recolha_armadilhas: Number(lance.armadilhasRecolhidas),
                        latitude_inicial: lance.latitude,
                        longitude_inicial: lance.longitude,
                        latitude_final: Number(sincroniza.latRec),
                        longitude_final: Number(sincroniza.logRec),
                        inicio_arrasto: dataCompleta3,
                        final_arrasto: dataCompleta2,
                        profundidade: Number(lance.profundidade),
                        especies: lance.especiesExtras.filter(
                          (item) =>
                            item.id !== null &&
                            item.peso !== null &&
                            item.quantidade !== null
                        ),
                        id_fundo: Number(lance.id_fundo),
                        id_isca: Number(lance.id_isca),
                      });
                      break;
                    case "espinhel":
                      //espinhel
                      dados.dados_pescaria.push({
                        data: dataCompleta,
                        latitude_inicial: Number(lance.latitude),
                        longitude_inicial: Number(lance.longitude),
                        latitude_final: Number(sincroniza.latRec),
                        longitude_final: Number(sincroniza.logRec),
                        inicio_arrasto: dataCompleta3,
                        final_arrasto: dataCompleta2,
                        profundidade: Number(lance.profundidade),
                        profundidade_recolha: Number(lance.profundidadeR) || 0,
                        light_stick: Boolean(lance.ligth_stick),
                        especies: lance.especiesExtras.filter(
                          (item) =>
                            item.id !== null &&
                            item.peso !== null &&
                            item.quantidade !== null
                        ),
                        id_isca: Number(lance.id_isca),
                        n_anzois: lance.armadilhasLancadas, //passamos a proprieda armadilhasLancadas porque no objeto criado é o nome padrao e nos usamos ele para posiçao do n_anzois
                        n_samburas: lance.armadilhasRecolhidas,
                        n_anzois_recolha: Number(lance.armadilhasLancadasR),
                        n_samburas_recolha: Number(lance.armadilhasRecolhidasR),
                        temperatura_superficie: Number(lance.peso),
                        temperatura_superficie_recolha: Number(lance.pesoR),
                        dados_descartes: lance.dados_descartes.filter(
                          (item) =>
                            item.id !== null &&
                            item.vivos !== null &&
                            item.mortos !== null
                        ),
                        dados_incidentais_espinhel: lance.dados_incidentais.filter(
                          (item) =>
                            item.nome !== "undefined" &&
                            item.nome !== undefined &&
                            item.quantidade !== null &&
                            item.quantidade !== "null"
                        ),
                      });
                      break;
                    case "cerco":
                      //cerco
                      dados.dados_pescaria.push({
                        data: dataCompleta,
                        latitude_inicial: lance.latitude,
                        longitude_inicial: lance.longitude,
                        latitude_final: Number(sincroniza.latRec),
                        longitude_final: Number(sincroniza.logRec),
                        inicio_arrasto: dataCompleta3,
                        final_arrasto: dataCompleta2,
                        especies: lance.especiesExtras.filter(
                          (item) =>
                            item.id !== null &&
                            item.peso !== null &&
                            item.quantidade !== null
                        ),
                        tempo_procura_minutos: Number(lance.tempo_procura),
                        temperatura_superficie: lance.armadilhasLancadas,
                        profundidade: lance.armadilhasRecolhidas,
                      });
                      break;
                    case "emalhar":
                      //emalhe
                      dados.dados_pescaria.push({
                        data: dataCompleta,
                        latitude_inicial: lance.latitude,
                        longitude_inicial: lance.longitude,
                        latitude_final: Number(sincroniza.latRec),
                        longitude_final: Number(sincroniza.logRec),
                        inicio_arrasto: dataCompleta3,
                        final_arrasto: dataCompleta2,
                        comprimento_total_rede: lance.armadilhasLancadas,
                        altura_total_rede: lance.armadilhasRecolhidas,
                        tamanho_malha: Number(lance.peso),
                        profundidade: Number(lance.profundidade),
                        especies: lance.especiesExtras.filter(
                          (item) =>
                            item.id !== null &&
                            item.peso !== null &&
                            item.quantidade !== null
                        ),
                        dados_incidentais_emalhe: lance.dados_incidentais.filter(
                          (item) =>
                            item.nome !== "undefined" &&
                            item.nome !== null &&
                            item.vivos !== null &&
                            item.vivos !== "null" &&
                            item.mortos !== null &&
                            item.mortos !== "null"
                        ),
                      });
                      break;
                  }
                }
              }
            });

            //código feito para buscar o id da especie que foi selecionada
            // a especie é escolhida pelo nome aqui buscamos na Especies pela especie escolhida e pegamos o id
            const especies = JSON.parse(global?.window?.localStorage.getItem("Especies") || '[]');
            const id_nome: Number[] = [];
            especies.map((especie) => {
              if (especie.nome == sincroniza.nomeEspecie) {
                id_nome.push(especie.id);
              }
            });

            console.log(dados.dados_pescaria);

            const result = sincroniza.salvarDadosRelatorio(
              {
                id_especie: id_nome,
                id_arte: Number(dados.id_arte),
                id_e: Number(dados.id_embarcacao),
                id_u: Number(dados.id_usuario),
                nome: dados.nome_armador,
                porto_c: Number(dados.porto_chegada),
                porto_s: Number(dados.porto_saida),
                data_chegada: dados.data_chegada,
                data_saida: dados.data_saida,
                dados_pescaria: dados.dados_pescaria
              }
            );

            if (await result) {
              sincroniza.setMostrarModal5(true)

            } else {
              sincroniza.setMostrarModal6(true)
            }
          }

        }

      }
      )
    } else {
      sincroniza.setMostrarModal6(true)

    }

  } else {
    //alert('Esperando conexão com a API ...')
  }
};

export default function missaoConcluida(missao: types_missao_concluida) {
  const lances = JSON.parse(localStorage.getItem("historicoLances") || '[]');
  const rastroDoBarco = JSON.parse(localStorage.getItem("rastro") || '[]');

  if (lances.length != 0) {
    const dadosConclusao = missao.dadosDeConclusao;

    if (dadosConclusao && dadosConclusao.length === 2) {
      const [portoChegada, dataChegada] = dadosConclusao;
      const mapasDeBordo = JSON.parse(localStorage.getItem("mapasDeBordo") || '{}');

      Object.keys(mapasDeBordo).forEach((mapaKey) => {
        const mapa = mapasDeBordo[mapaKey];
        if (mapa && mapa.lancesMapa) {
          const lancesMapa = mapa.lancesMapa;

          Object.keys(lancesMapa).forEach((lanceKey) => {
            const lance = lancesMapa[lanceKey];
            lance.portoChegada = portoChegada;
            lance.dataChegada = dataChegada;
          });
        }
      });

      localStorage.setItem("mapasDeBordo", JSON.stringify(mapasDeBordo));
    }

    //Logica para os pdfs
    //aqui é o tratamento da data e porto para adicionar no pdf (deixar no formato hora:min e dia/mes/ano ao inves de Date)
    if (dadosConclusao && dadosConclusao.length === 2) {
      const [portoChegada, dataChegada] = dadosConclusao;
      const mapasPdf = JSON.parse(localStorage.getItem("mapasPdf") || '[]') || {};
      // forEach usados para colocar a data e porto de chegado relacionado a cada lance feito
      Object.keys(mapasPdf).forEach((mapaKey) => {
        const mapa = mapasPdf[mapaKey]

        if (mapa && mapa.lancesPdf) {
          const lancesPdf = mapa.lancesPdf
          Object.keys(lancesPdf).forEach((lanceKey) => {
            const lance = lancesPdf[lanceKey];
            const portos = JSON.parse(
              global?.window?.localStorage.getItem("Portos") || '[]'
            );

            //código que buscamos pelo porto apartir do id que temos e pegamos o nome relacionado
            const id_nome: string[][] = [];

            portos.map((porto) => {
              if (porto.id == portoChegada) {
                id_nome.push([porto.nome]);
              }
            });
            lance.portoChegada = id_nome[0][0];
            lance.dataChegada = dataChegada.toLocaleDateString("pt-BR");
            lance.comprimento = missao.comp;
            lance.altura = missao.alturaS;
          });
        }
      });

      localStorage.setItem("mapasPdf", JSON.stringify(mapasPdf));
    }
    sincronizarDadosNoBanco(
      {
        conexaoDaApi: missao.conexaoDaApi,
        tipoDeArte: missao.tipoDeArte,
        latRec: missao.latRec,
        logRec: missao.logRec,
        nomeEspecie: missao.nomeEspecie,
        salvarDadosRelatorio: missao.salvarDadosRelatorio,
        setMostrarModal5: missao.setMostrarModal5,
        setMostrarModal6: missao.setMostrarModal6
      });
    missao.setConcluindoMissao(false);
    missao.setDesativaBotoes(false);
    missao.setDesativaEspecie(false);
    missao.setMostrarLancar(true);

  } else {
    missao.setMostrarModal3(true);
    missao.setConcluindoMissao(false);
  }
};