import format from "date-fns/format";
import { types_recolher } from "../../../components/types/functions-types";

 export default function handleRecolher (recolher: types_recolher) {

    // ### Criação da tabela baseado no tipo de arte ### //

    if (recolher.tipoDeArte == "espinhel") {
      //logica do recolhimento
      const novaDataPetrecho:String[][] = recolher.dataPetrecho.map((column, colIndex) => {
        if (colIndex === 0) {
          return [...column, Number(recolher.lat).toFixed(5)];
        } else if (colIndex === 1) {
          return [...column, Number(recolher.log).toFixed(5)];
        } else if (colIndex === 2) {
          const dataAtual = format(new Date(), "dd/MM");
          return [...column, dataAtual];
        } else if (colIndex === 3) {
          const horaAtual = format(new Date(), "HH:mm");
          return [...column, horaAtual];
        } else if (colIndex === 5) {
          const horaAtual = format(new Date(), "HH:mm");
          return [...column, horaAtual];
        } else {
          return [...column, ""];
        }
      });

      //dados de descarte
      recolher.setCabEspDescartes([...recolher.cabEspDescartes, "Morto"]);
      recolher.setHCabEspDescartes(recolher.cabEspDescartes);
      recolher.setHDadosDescartes(recolher.dadosDescartes);

      //dados de incidentais
      recolher.setCabStatusEs([...recolher.cabStatusEs, "Morto"]);
      recolher.setHcabStatusEs(recolher.cabStatusEs);
      recolher.setHIdadosEs(recolher.IdadosEs);

      recolher.setCabTabela([...recolher.cabTabela, `Recolhimento`]);
      recolher.setDataPetrecho(novaDataPetrecho);
      recolher.setHistCab(recolher.cabTabela);
      recolher.setHistCabE(recolher.cabEspinhel);
      recolher.setHistTabela(recolher.dataPetrecho);
      recolher.setLatRec(recolher.lat);
      recolher.setLogRec(recolher.log);
      recolher.setLancado(false);
      recolher.setMostrar3Botoes(false);
      recolher.setMostrarConcluir(false);
      recolher.setMostrarMissao(false);
      recolher.setMostrarRecolher(false);
      recolher.setMostrarTabela(true);
      recolher.setDesativaBotoes(true);
      recolher.setMensagemLance(false);
      
    } else {
      let lance: string[] = [];
      let lances: string[][] = []; // Define lances como um array de arrays de strings
      
      lances.push(lance); // Agora lances pode aceitar lance, que é um array de strings
      

      const ultimaPosicaoNumero = recolher.dataPetrecho[3].length - 1;
      recolher.dataPetrecho[5][ultimaPosicaoNumero] = format(new Date(), "HH:mm");

      //for que percorre os lances e adiciona a hora na posição e lance correto
      for (let i = 0; i < 7; i++) {
        const l = recolher.dataPetrecho[i][recolher.lancamentos - 1];
        lance.push(String(l));
      }



      if (recolher.tipoDeArte == "cerco") {
        const ultimaPosicaoNumero = recolher.dataPetrecho[3].length - 1;
        const dataLocal = global?.window?.localStorage.getItem("dataCompleta") // colocamos no localStorage por ser mais facil de salvar o newDate
        let data;
        if(dataLocal){
          data = new Date(dataLocal)
        }

        // ### Calcular tempo necessário no tipo de arte cerco (minutos) ### //
        const calcularDiferencaEmHoras = ( dataInicio: Date,
        dataFim: Date
      ): string => {
          
          //tratamento para pegar a diferença entre a horas em minutos
          const diffMs = dataFim.getTime() - dataInicio.getTime();
          const diffHours = Math.floor(diffMs / 3600000); // 3600000 ms = 1 hora
          const diffMinutes = Math.floor((diffMs % 3600000) / 60000); // 60000 ms = 1 minuto

          return `${diffMinutes}`;
        }
        const dataAgr = new Date();

        recolher.dataPetrecho[7][ultimaPosicaoNumero] = calcularDiferencaEmHoras(
          data,
          dataAgr)
      }

      recolher.setLatRec(recolher.lat);
      recolher.setLogRec(recolher.log);
      lances.push(lance);
      recolher.setLancado(false);
      recolher.setMostrar3Botoes(false);
      recolher.setMostrarConcluir(false);
      recolher.setMostrarMissao(false);
      recolher.setMostrarRecolher(false);
      recolher.setMostrarTabela(true);
      recolher.setDesativaBotoes(true);
      recolher.setMensagemLance(false);
    }
  };
