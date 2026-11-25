import format from "date-fns/format";
import { types_handle_petrecho } from "../../../components/types/functions-types";
export default function handlePetrecho (handlePetrecho: types_handle_petrecho)  {
    const iscaLocal = global?.window?.localStorage.getItem("Iscas");
    const fundoLocal = global?.window?.localStorage.getItem("Fundos");
    //pegamos o id e nome para colocar em um objeto  que passo pro select
    
    if (iscaLocal && fundoLocal) {
      const isca = JSON.parse(iscaLocal)
      const fundo = JSON.parse(fundoLocal)
      const nomeIsca = isca.map((i) => ({
        id: i.id,
        nome: i.nome,
      }));

      const nomeFundo = fundo.map((f) => ({
        id: f.id,
        nome: f.nome,
      }));
      handlePetrecho.setIscas(nomeIsca);

      if (handlePetrecho.tipoDeArte == "espinhel") {
        handlePetrecho.setFundos([
          { id: "1", nome: "Sim" },
          { id: "2", nome: "Não" },
        ]);
      } else {
        handlePetrecho.setFundos(nomeFundo);
      }
    } else {
      handlePetrecho.setIscas([]);
      handlePetrecho.setFundos([]);
    }

    // ### Criação da tabela baseado no tipo de arte ### //

    if (handlePetrecho.tipoDeArte == "espinhel") {
      if (handlePetrecho.lancamentos < 3) {
        const novaDataPetrecho: String[][] = handlePetrecho.dataPetrecho.map((column, colIndex) => {
          if (colIndex === 0) {
            return [...column, Number(handlePetrecho.lat).toFixed(5)];
          } else if (colIndex === 1) {
            return [...column, Number(handlePetrecho.log).toFixed(5)];
          } else if (colIndex === 2) {
            localStorage.setItem("dataCompleta", JSON.stringify(new Date()));
            const dataAtual = format(new Date(), "dd/MM");
            return [...column, dataAtual];
          } else if (colIndex === 3) {
            const horaAtual = format(new Date(), "HH:mm");
            return [...column, horaAtual];
          } else if (colIndex === 5) {
            return [...column, "-"];
          } else {
            return [...column, ""];
          }
        },
         
        handlePetrecho.setLancamentos(handlePetrecho.lancamentos + 1));

        // VARIAVEIS PARA TRATAR A TABELA DE DESCARTES
        handlePetrecho.setCabLanceDescartes([
          ...handlePetrecho.cabLanceDescartes,
          `Lance ${handlePetrecho.lancamentos + 1}`,
        ]);

      

        handlePetrecho.setCabEspDescartes([...handlePetrecho.cabEspDescartes, "Vivo"]);
        handlePetrecho.setHCabLanceDescartes(handlePetrecho.cabLanceDescartes);
        handlePetrecho.setHCabEspDescartes(handlePetrecho.cabEspDescartes);

        //variaves da tabela incidentais
        handlePetrecho.setCabLanceEs([...handlePetrecho.cabLanceEs, `Lance ${handlePetrecho.lancamentos + 1}`]);
        handlePetrecho.setCabStatusEs([...handlePetrecho.cabStatusEs, "Vivo"]);
        handlePetrecho.setHCabLanceEs(handlePetrecho.cabLanceEs);
        handlePetrecho.setHcabStatusEs(handlePetrecho.cabStatusEs);

        handlePetrecho.setCabTabela([...handlePetrecho.cabTabela, `Lançamento`]);
        handlePetrecho.setCabEspinhel([...handlePetrecho.cabEspinhel, `Lance ${handlePetrecho.lancamentos + 1}`]);
        handlePetrecho.setDataPetrecho(novaDataPetrecho);
        handlePetrecho.setHistCab(handlePetrecho.cabTabela);
        handlePetrecho.setHistTabela(handlePetrecho.dataPetrecho);

        //váriaves de controle da tela
        handlePetrecho.setMostrarBIncidentais(false);
        handlePetrecho.setMostrarBDescartes(false);
        handlePetrecho.setLancado(true);
        handlePetrecho.setMostrarTabela(true);
        handlePetrecho.setMostrarLancar(false);
        handlePetrecho.setMostrar3Botoes(false);
        handlePetrecho.setMostrarConcluir(false);
        handlePetrecho.setMostrarMissao(false);
      //  handlePetrecho.setDesativaConcluir(true);
        handlePetrecho.setDesativaEspecie(true);
      }
      global?.window?.localStorage.setItem("NumeroLancamentos", `${handlePetrecho.lancamentos + 1}`);
    } else {

      // ### Criação da tabela baseado no tipo de arte ### //

      if (handlePetrecho.lancamentos < 6) {
        const novaDataPetrecho = handlePetrecho.dataPetrecho.map((column, colIndex) => {
          if (colIndex === 0) {
            return [...column, Number(handlePetrecho.lat).toFixed(5)];
          } else if (colIndex === 1) {
            return [...column, Number(handlePetrecho.log).toFixed(5)];
          } else if (colIndex === 2) {
            localStorage.setItem("dataCompleta", String(new Date()));
            const dataAtual = format(new Date(), "dd/MM");
            return [...column, dataAtual];
          } else if (colIndex === 3) {
            const horaAtual = format(new Date(), "HH:mm");
            return [...column, horaAtual];
          } else {
            return [...column, ""];
          }
        }, handlePetrecho.setLancamentos(handlePetrecho.lancamentos + 1));

        handlePetrecho.setCabEm([...handlePetrecho.cabEm, `Lance ${handlePetrecho.lancamentos + 1}`]);

        handlePetrecho.setHistCab(handlePetrecho.cabTabela);
        handlePetrecho.setHistTabela(handlePetrecho.dataPetrecho);
        handlePetrecho.setCabTabela([...handlePetrecho.cabTabela, `${handlePetrecho.lancamentos + 1}° Lance`]);
        handlePetrecho.setDataPetrecho(novaDataPetrecho);

        global?.window?.localStorage.setItem("NumeroLancamentos", `${handlePetrecho.lancamentos + 1}`);

        handlePetrecho.setMostrarTabela(true);
        handlePetrecho.setMostrarLancar(false);
        handlePetrecho.setMostrar3Botoes(false);
        handlePetrecho.setMostrarConcluir(false);
        handlePetrecho.setMostrarMissao(false);
       // handlePetrecho.setDesativaConcluir(true);
        handlePetrecho.setDesativaEspecie(true);
        handlePetrecho.setLancado(true);
        handlePetrecho.setMostrarBIncidentais(false);
      }
    }
  };