import format from "date-fns/format";
import { types_salvar } from "../../types/functions-types";

//função que auxilia na verificação de preenchimento da tabela, usamos para saber se a tabela foi preenchida por completo
const verificarPreenchimento = (preenchido, preenchido2, tipoDeArte) => {
  //verifica a coluna (preenchido, preenchido2)
  // no espinhel verifica os 2 e nos outros tipos de arte somente o preenchido
  if (tipoDeArte === "espinhel") {
    for (let i = 0; i < preenchido.length; i++) {
      if (preenchido[i] === "") {
        return false;
      }
    }

    for (let i = 0; i < preenchido2.length; i++) {
      if (preenchido2[i] === "") {
        return false;
      }
    }

    return true;
  } else {
    for (let i = 0; i < preenchido.length; i++) {
      if (preenchido[i] === "") {
        return false;
      }
    }

    return true;
  }
};

export default async function salvar(salvar: types_salvar) {
  if (salvar.lancado) {
    salvar.setMostrarTabela(false);
    salvar.setMostrarRecolher(true);
    salvar.setMensagemLance(true);
    salvar.setMostrar3Botoes(true);
    salvar.setMostrarConcluir(true);
    salvar.setMostrarMissao(true);
    // salvar.setDesativaConcluir(true);
    salvar.setDesativaEspecie(true);
    salvar.setLancado(false);

    salvar.setMostrarConfig(true);
    salvar.setMostrarBotaoConfig(true);

    if (salvar.tipoDeArte == "espinhel") {
      salvar.setMostrarBDescartes(true);
      salvar.setMostrarBIncidentais(true);
    } else if (salvar.tipoDeArte == "emalhar") {
      salvar.setMostrarBIncidentais(true);
    } else {
      salvar.setMostrarBDescartes(false);
      salvar.setMostrarBIncidentais(false);
    }
  } else {
    // quando recolhemos e salvamos ai sim salvamos as alterações feitas na nossa tabela(matriz)
    let preenchido;
    let preenchido2;
    if (salvar.tipoDeArte == "espinhel") {
      if (salvar.lancamentos == 1) {
        preenchido = salvar.dataPetrecho.map((column) => {
          return column[salvar.lancamentos];
        });
        preenchido2 = salvar.dataPetrecho.map((column) => {
          return column[salvar.lancamentos + 1];
        });
      } else if (salvar.lancamentos == 2) {
        preenchido = salvar.dataPetrecho.map((column) => {
          return column[salvar.lancamentos + 1];
        });
        preenchido2 = salvar.dataPetrecho.map((column) => {
          return column[salvar.lancamentos + 2];
        });
      } else if (salvar.lancamentos == 3) {
        preenchido = salvar.dataPetrecho.map((column) => {
          return column[salvar.lancamentos + 2];
        });
        preenchido2 = salvar.dataPetrecho.map((column) => {
          return column[salvar.lancamentos + 3];
        });
      }
    } else {
      preenchido = salvar.dataPetrecho.map((column) => {
        return column[salvar.lancamentos];
      });
      preenchido2 = [];
    }
    //id da especie alvo, usa o nome para buscar a especie e pegar o id
    const especies = JSON.parse(
      global?.window?.localStorage.getItem("Especies") || "[]"
    );
    const id_nome: string[][] = [];
    especies.map((especie) => {
      if (especie.nome == salvar.nomeEspecie) {
        const e: string[] = [especie.id, especie.nome];
        id_nome.push(e);
      }
    });

    //códgio para criar um array com id e nome ds iscas
    const iscas = JSON.parse(
      global?.window?.localStorage.getItem("Iscas") || "[]"
    );

    const id_isca: string[][] = [];
    iscas.map((isca) => {
      if (isca.nome == preenchido[9]) {
        id_isca.push([isca.id, isca.nome]);
      }
    });

    let id_fundo: string[][] = [];
    let ligth: boolean = false;

    if (salvar.tipoDeArte == "espinhel") {
      if (preenchido[10] == "Sim") {
        ligth = true;
      } else if (preenchido[10] == "Não") {
        ligth = false;
      }
    } else {
      const fundos = JSON.parse(
        global?.window?.localStorage.getItem("Fundos") || "[]"
      );
      fundos.map((fundo) => {
        if (fundo.nome == preenchido[10]) {
          id_fundo.push([fundo.id, fundo.nome]);
        }
      });
    }
    const preencheu = verificarPreenchimento(
      preenchido,
      preenchido2,
      salvar.tipoDeArte
    );
    let dadosObjeto;
    let dadosPdf;
    let lancesMapa = {};
    let lancesPdf = {};

    //transformando os dados em objeto
    if (preencheu) {
      // se ta tudo preenchido criamos 2 objetos
      // dadosObjeto que é onde salvamos os id e dados completos
      // e o dadosPdf que os dados estão formatos para ficarem no pdf
      dadosObjeto = {
        latitude: Number(preenchido[0]).toFixed(7),
        longitude: Number(preenchido[1]).toFixed(7),
        latitudeRec: Number(salvar.latRec).toFixed(7),
        longitudeRec: Number(salvar.logRec).toFixed(7),
        dataLance: preenchido[2],
        dataLanceR: preenchido2[2],
        horaLancamento: preenchido[3],
        horaLancamentoR: preenchido2[3],
        armadilhasLancadas: Number(preenchido[4]),
        armadilhasLancadasR: Number(preenchido2[4]), // n de armadilhas ou n de anzois ou comprimento da rede ou temp superficie
        horaRecolhimento: preenchido[5],
        horaRecolhimentoR: preenchido2[5],
        armadilhasRecolhidas: Number(preenchido[6]),
        armadilhasRecolhidasR: Number(preenchido2[6]),
        profundidade: preenchido[7],
        profundidadeR: preenchido2[7],
        temperaturaSuperficie: preenchido[8],
        temperaturaSuperficieR: preenchido2[8],
        especie: id_nome,
        especiesExtras: [],
        dados_descartes: [],
        dados_incidentais: [],
        nomeEmbarcacao: salvar.dadosDaViagem[0],
        idEmbarcacao: salvar.dadosViagemId[0],
        tipoArmadilha: salvar.dadosDaViagem[2],
        idArmadilha: salvar.dadosViagemId[2],
        portoSaidaId: salvar.dadosViagemId[3],
        portoSaida: salvar.dadosDaViagem[3],
        dataSaida: salvar.dadosDaViagem[4],
        empresaArmador: salvar.dadosUsuario.nome,
        idUsuario: salvar.dadosUsuario.id,
        dataChegada: "",
        portoChegada: "",
        id_isca: id_isca[0] ? Number(id_isca[0][0]) : null,
        id_fundo: id_fundo[0] ? Number(id_fundo[0][0]) : null,
        light_stick: ligth,
        tempo_procura: preenchido[7],
        tempo_procuraR: preenchido2[7],
      };

      dadosPdf = {
        latitude: Number(preenchido[0]).toFixed(7),
        longitude: Number(preenchido[1]).toFixed(7),
        latitudeRec: Number(salvar.latRec).toFixed(7),
        longitudeRec: Number(salvar.logRec).toFixed(7),
        dataLance: preenchido[2],
        dataLanceR: preenchido2[2],
        horaLancamento: preenchido[3],
        horaLancamentoR: preenchido2[3],
        armadilhasLancadas: Number(preenchido[4]),
        armadilhasLancadasR: Number(preenchido2[4]),
        horaRecolhimento: preenchido[5],
        horaRecolhimentoR: preenchido2[5],
        armadilhasRecolhidas: Number(preenchido[6]),
        armadilhasRecolhidasR: Number(preenchido2[6]),
        profundidade: Number(preenchido[7]),
        profundidadeR: Number(preenchido2[7]),
        peso: preenchido[8],
        pesoR: preenchido2[8],
        especie: id_nome,
        especiesExtras: [],
        dados_descartes: [],
        dados_incidentais: [],
        nomeEmbarcacao: salvar.dadosDaViagem[0],
        idEmbarcacao: salvar.dadosViagemId[0],
        tipoArmadilha: salvar.dadosDaViagem[2],
        idArmadilha: salvar.dadosViagemId[2],
        portoSaidaId: salvar.dadosViagemId[3],
        portoSaida: salvar.dadosDaViagem[3],
        dataSaida: new Date(salvar.dadosDaViagem[4]).toLocaleDateString(
          "pt-BR"
        ),
        empresaArmador: salvar.dadosUsuario.nome,
        idUsuario: salvar.dadosUsuario.id,
        dataChegada: "",
        portoChegada: "",
        id_isca: preenchido[9],
        id_fundo: preenchido[10],
        tempo_procura: preenchido[7],
        tempo_procuraR: preenchido2[7],
        altura: "",
        comprimento: "",
      };

      if (salvar.tipoDeArte == "espinhel") {
        dadosObjeto.especiesExtras = salvar.tabelaDate?.map(
          ([id, , n, peso]) => ({
            id: Number(id),
            quantidade: Number(n),
            peso: Number(peso),
          })
        ) || [{}];
        dadosObjeto.dados_incidentais = salvar.IdadosEs?.map(
          ([nome, vivos, mortos]) => ({
            nome: String(nome),
            vivos: Number(vivos),
            mortos: Number(mortos),
          })
        ) || [{}];
        dadosObjeto.dados_descartes = salvar.dadosDescartes?.map(
          ([id, nome, vivos, mortos]) => ({
            id: Number(id),
            vivos: Number(vivos),
            mortos: Number(mortos),
          })
        ) || [{}];
      } else if (salvar.tipoDeArte == "emalhar") {
        dadosObjeto.dados_incidentais = salvar.dadosEm?.map(
          ([nome, quantidade]) => ({
            nome: String(nome),
            quantidade: Number(quantidade),
          })
        ) || [{}];
        dadosObjeto.especiesExtras = salvar.tabelaDate?.map(([id, , peso]) => ({
          id: Number(id),
          peso: Number(peso),
        })) || [{}];
      } else {
        dadosObjeto.especiesExtras = salvar.tabelaDate?.map(([id, , peso]) => ({
          id: Number(id),
          peso: Number(peso),
        })) || [{}];
      }

      localStorage.setItem(
        `lance${salvar.lancamentos}`,
        JSON.stringify(dadosObjeto)
      );

      const lancesAtual =
        JSON.parse(localStorage.getItem("historicoLances") || "[]") || [];
      lancesAtual.push([dadosObjeto]);
      localStorage.setItem("historicoLances", JSON.stringify(lancesAtual));

      localStorage.setItem(`L${salvar.lancamentos}`, JSON.stringify(dadosPdf));
      if (salvar.tipoDeArte == "espinhel") {
        dadosPdf.especiesExtras = salvar.tabelaDate?.map(
          ([, nome, n, peso]) => ({
            nome: String(nome),
            quantidade: Number(n),
            peso: Number(peso),
          })
        ) || [{}];
        dadosPdf.dados_incidentais = salvar.IdadosEs?.map(
          ([nome, vivos, mortos]) => ({
            nome: String(nome),
            vivos: Number(vivos),
            mortos: Number(mortos),
          })
        ) || [{}];
        dadosPdf.dados_descartes = salvar.dadosDescartes?.map(
          ([id, nome, vivos, mortos]) => ({
            nome: String(nome),
            vivos: Number(vivos),
            mortos: Number(mortos),
          })
        ) || [{}];
      } else if (salvar.tipoDeArte == "emalhar") {
        dadosPdf.dados_incidentais = salvar.dadosEm?.map(
          ([nome, quantidade]) => ({
            nome: String(nome),
            quantidade: Number(quantidade),
          })
        ) || [{}];
        dadosPdf.especiesExtras = salvar.tabelaDate?.map(([, nome, peso]) => ({
          nome: String(nome),
          peso: Number(peso),
        })) || [{}];
      } else {
        dadosPdf.especiesExtras = salvar.tabelaDate?.map(([, nome, peso]) => ({
          nome: String(nome),
          peso: Number(peso),
        })) || [{}];
      }
      const lanceAtual =
        JSON.parse(localStorage.getItem("historicoPdf") || "[]") || [];
      lanceAtual.push([dadosPdf]);

      localStorage.setItem("historicoPDF", JSON.stringify(lanceAtual));
      localStorage.setItem(`L${salvar.lancamentos}`, JSON.stringify(dadosPdf));

      for (let i = 1; i <= 6; i++) {
        const lance = JSON.parse(localStorage.getItem(`lance${i}`) || "[]");
        if (lance) {
          lancesMapa[`lance${i}`] = lance;
        }
      }

      for (let i = 1; i <= 6; i++) {
        const l = JSON.parse(localStorage.getItem(`L${i}`) || "[]");
        if (l) {
          lancesPdf[`lance${i}`] = l;
        }
      }

      salvar.setMostrarLancar(true);
      salvar.setMostrarTabela(false);
      salvar.setDesativaBotoes(false);
      salvar.setDadosDescartes([]);
      salvar.setIDadosEs([]);
      salvar.setDadosEm([]);
      salvar.setMensagemLance(false);
      salvar.setMostrar3Botoes(true);
      salvar.setMostrarConcluir(true);
      salvar.setMostrarMissao(true);
      // salvar.setDesativaConcluir(false);

      salvar.setCabEm([""]);

      salvar.setTabelaDate([[]]);
      salvar.setEspecieExtra([]);
      salvar.setCabLanceDescartes(["", ""]);
      salvar.setHCabLanceDescartes([]);
      salvar.setCabEspDescartes(["N°de identificação", "Espécie"]);
      salvar.setHCabEspDescartes([]);
      salvar.setDadosDescartes([[]]);
      salvar.setEspeciesDescartadas([""]);

      salvar.setCabLanceEs([""]);
      salvar.setHCabLanceEs([]);
      salvar.setCabStatusEs(["Especies"]);
      salvar.setHcabStatusEs([]);
      salvar.setIDadosEs([]);
      salvar.setHIdadosEs([]);

      salvar.setMostrarConfig(true);
      salvar.setMostrarBotaoConfig(true);
    } else {
      salvar.setMostrarModal4(true);
    }

    if (salvar.tipoDeArte == "espinhel" && salvar.lancamentos == 3) {
      if (preencheu) {
        //Salvando os dados de criação do mapa de bordo (data de criação, etc)
        const tabMapas =
          JSON.parse(localStorage.getItem("tabMapasDeBordo") || "[]") || [];
        const data = format(new Date(), "dd/MM");
        tabMapas.push([tabMapas.length + 1, dadosObjeto.especie, data]);
        localStorage.setItem("tabMapasDeBordo", JSON.stringify(tabMapas));

        const mapasDeBordo =
          JSON.parse(localStorage.getItem("mapasDeBordo") || "[]") || {};

        mapasDeBordo[`${tabMapas.length}`] = { lancesMapa };

        localStorage.setItem("mapasDeBordo", JSON.stringify(mapasDeBordo));

        //Lógica dos pdfs
        const mapasPdf =
          JSON.parse(localStorage.getItem("mapasPdf") || "[]") || {};

        mapasPdf[`${tabMapas.length}`] = { lancesPdf };
        localStorage.setItem("mapasPdf", JSON.stringify(mapasPdf));

        //Ações que controlam a tela
        salvar.setLancamentos(0);
        global?.window?.localStorage.setItem("NumeroLancamentos", `${0}`);

        salvar.setDataPetrecho(salvar.mapaEscolhido);
        salvar.setCabTabela(["Discriminação"]);
        salvar.setCabEspinhel([""]);
        salvar.setMostrarModal1(true);
        salvar.setMostrarLancar(false);
        salvar.setDesativaBotoes(false);
        salvar.setDesativaEspecie(false);
        salvar.setTabelaDate([]);
        salvar.setMensagemLance(false);
        salvar.setMostrar3Botoes(true);
        salvar.setMostrarConcluir(true);
        salvar.setMostrarMissao(true);
        // salvar.setDesativaConcluir(false);
      } else {
        salvar.setMostrarModal4(true);
      }
    }

    if (salvar.lancamentos == 6) {
      if (preencheu) {
        //Salvando os dados de criação do mapa de bordo (data de criação, etc)
        const tabMapas =
          JSON.parse(localStorage.getItem("tabMapasDeBordo") || "[]") || [];
        const data = format(new Date(), "dd/MM");
        tabMapas.push([tabMapas.length + 1, dadosObjeto.especie, data]);
        localStorage.setItem("tabMapasDeBordo", JSON.stringify(tabMapas));

        const mapasDeBordo =
          JSON.parse(localStorage.getItem("mapasDeBordo") || "[]") || {};

        mapasDeBordo[`${tabMapas.length}`] = { lancesMapa };

        localStorage.setItem("mapasDeBordo", JSON.stringify(mapasDeBordo));

        //Lógica dos pdfs
        const mapasPdf =
          JSON.parse(localStorage.getItem("mapasPdf") || "[]") || {};

        mapasPdf[`${tabMapas.length}`] = { lancesPdf };

        localStorage.setItem("mapasPdf", JSON.stringify(mapasPdf));

        salvar.setTabelaDate([[]]);
        salvar.setEspecieExtra([]);

        //Ações que controlam a tela
        salvar.setLancamentos(0);
        global?.window?.localStorage.setItem("NumeroLancamentos", `${0}`);

        salvar.setDataPetrecho(salvar.mapaEscolhido);
        salvar.setCabTabela(["Discriminação"]);
        salvar.setCabEspinhel([""]);
        salvar.setMostrarModal1(true);
        salvar.setMostrarLancar(false);
        salvar.setDesativaBotoes(false);
        salvar.setDesativaEspecie(false);
        salvar.setTabelaDate([]);
        salvar.setMensagemLance(false);
        salvar.setMostrar3Botoes(true);
        salvar.setMostrarConcluir(true);
        salvar.setMostrarMissao(true);
        // salvar.setDesativaConcluir(false);
      } else {
        salvar.setMostrarModal4(true);
      }
    }
  }
}
