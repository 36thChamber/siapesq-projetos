import { types_cancelar } from "../../../components/types/functions-types";

export function cancelar(cancelar: types_cancelar)
{
    if (cancelar.lancado) {
     
      cancelar.setMostrarTabela(false);
      cancelar.setMostrarLancar(true);
      cancelar.setDesativaBotoes(false);
      cancelar.setMostrarConcluir(true);
      cancelar.setMostrarMissao(true);
      cancelar.setDesativaBotoes(false);
      cancelar.setDesativaEspecie(false);
      //cancelar.setDesativaConcluir(false);
      cancelar.setLancado(false);

      cancelar.setCabEspinhel(cancelar.histCabE);
      cancelar.setCabTabela(cancelar.histCab);

      cancelar.setLancamentos(cancelar.lancamentos - 1);
      global?.window?.localStorage.setItem("NumeroLancamentos", `${cancelar.lancamentos - 1}`);
      cancelar.setDataPetrecho(cancelar.histTabela);

      cancelar.setCabLanceExtras(cancelar.HcabLanceExtras);
      cancelar.setCabEspecieExtras(cancelar.HcabEspecieExtras);
      cancelar.setDadosExtrasEs(cancelar.HdadosExtrasEs);

      //dados descarte
      cancelar.setCabLanceDescartes(cancelar.HcabLanceDescartes);
      cancelar.setCabEspDescartes(cancelar.HcabEspDescartes);
      cancelar.setDadosDescartes(cancelar.HdadosDescartes);
      //dados incidentais
      cancelar.setCabLanceEs(cancelar.HcabLanceEs);
      cancelar.setCabStatusEs(cancelar.HcabStatusEs);
    } else {
      if(cancelar.tipoDeArte ==="espinhel"){
        cancelar.setCabEspinhel(cancelar.histCabE);
        cancelar.setCabTabela(cancelar.histCab);
        cancelar.setDataPetrecho(cancelar.histTabela);

      //dados de descarte
      cancelar.setCabEspDescartes(cancelar.HcabEspDescartes);
      cancelar.setDadosDescartes(cancelar.HdadosDescartes);
      //dados de incidentais
      cancelar.setCabStatusEs(cancelar.HcabStatusEs);
      cancelar.setIDadosEs(cancelar.HIdadosEs);
      }

     
      cancelar.setMensagemLance(true);
      cancelar.setMostrarTabela(false);
      cancelar.setMostrarRecolher(true);
      cancelar.setDesativaBotoes(false);
      cancelar.setMostrarConcluir(true);
      cancelar.setMostrarMissao(true);
      cancelar.setDesativaBotoes(true);
      cancelar.setDesativaEspecie(true);
     // cancelar.setDesativaConcluir(true);
      cancelar.setLancado(false);
    }
  };