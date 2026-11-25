import React from 'react';
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fff',

  },
  background: {
    backgroundColor: '#E0E0E0',
    marginLeft: '10px',
    marginbottom: '2px',
  },
  background1: {
    backgroundColor: '#E0E0E0',
    margin: '10px',
    flex: 1,
  },
  cabeçalho: {
    backgroundColor: '#fff',
    fontSize: '10px',
    border: '1px solid #000',
    padding: 3,
    width: '274px',
    marginLeft: '7px',
    marginBottom: '4px',
  },
  cabText: {
    textAlign: 'center',
    padding: 5,
    margin: '3px',
    fontWeight: 'ultrabold',
  },
  titulos: {
    fontSize: '12px',
    padding: 8,
    fontWeight: 'extrabold'
  },
  row: {
    flexDirection: 'row',
  },
  rowWhite: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginLeft: '7px',
    marginRight: '15px',
    border: '1px solid  #000',
    padding: '5px'
  },
  textWhiteR: {
    fontSize: '10px',
    marginLeft: '20px'
  },
  textWhiteL: {
    fontSize: '10px',
    marginRight: '20px'
  },
  column: {
    flexDirection: 'column',
  },
  table: {
    marginLeft: '7px',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRow1: {
    flexDirection: 'row',
    width: '140px',
    padding: 6,
    fontSize: '7px',
    border: '1px solid #000',
    backgroundColor: '#fff',
  },
  tableColumn: {
    flexDirection: 'column',
  },
  tableCell: {
    width: '68px',
    padding: 6,
    fontSize: '7px',
    border: '1px solid #000',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  tableCell3: {
    width: '136px',
    padding: 6,
    fontSize: '7px',
    border: '1px solid #000',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  tableCell1: {
    width: '140px',
    padding: 6,
    textAlign: 'center',
    fontSize: '7px',
    border: '1px solid #000',
    backgroundColor: '#fff',
  },
  tableCell2: {
    padding: 4,
    width: '140px',
    fontSize: '9px',
    textAlign: 'center',
    border: '1px solid #000',
    backgroundColor: '#fff',
  },
  tableLance: {
    flexDirection: 'row',
    width: '68px',
    fontSize: '7px',
    padding: 6,
    border: '1px solid #000',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
});
const PdfEspinhel = (dadosMapa) => {

  const dados1: any[] = [
    (dadosMapa && dadosMapa?.dadosMapa?.lance1) || null,
    (dadosMapa && dadosMapa?.dadosMapa?.lance2) || null,
    (dadosMapa && dadosMapa?.dadosMapa?.lance3) || null,
  ];

  const especieExtras = [
    (dados1[0] && dados1[0].especiesExtras) || null,
    (dados1[1] && dados1[1].especiesExtras) || null,
    (dados1[2] && dados1[2].especiesExtras) || null
  ];

  const descartes = [
    (dados1[0] && dados1[0].dados_descartes) || null,
    (dados1[1] && dados1[1].dados_descartes) || null,
    (dados1[2] && dados1[2].dados_descartes) || null
  ];

  const incidentais = [
    (dados1[0] && dados1[0].dados_incidentais) || null,
    (dados1[1] && dados1[1].dados_incidentais) || null,
    (dados1[2] && dados1[2].dados_incidentais) || null
  ];

  const captura = [
    "Agulhão branco (WHM)",
    "Agulhão negro (BUM)",
    "Agulhão vela (SAI)",
    "Albacora Azul (BFT)",
    "Albacora bandolim (BET)",
    "Albacora branca (ALB)",
    "Albacora laje (YFT)",
    "Albacorinha (BLF)",
    "Arraia jamanta",
    "Barracuda",
    "Cavala empinge (WAH)",
    "Cavala preta",
    "Dourado (DOL)",
    "Espadarte (SWO)",
    "Peixe prego",
    "Tubarão azul (BSH)",
    "Tubarão cachorro",
    "Tubarão lombo preto (FAL)",
    "Tubarão mako / anequim (MAK)",
    "Tubarão martelo(SPX)",
    "Tubarão raposa (BTH)",
    "Tubarão tigre"
  ];

  const descarte = [
    "Agulhão branco (WHM)",
    "Agulhão negro (BUM)",
    "Agulhão vela (SAI)",
    "Tubarão azul (BSH)",
    "Tubarão mako / anequim",
    "Tubarão martelo (SPX)",
    "Tubarão raposa (ALV)"
  ];


  return (
    dados1.length > 0 ? (
      <Document>
        <Page size="A4" style={styles.page}>
          <Image src={'/images/cabeçalho-pdf.png'} style={{ width: '595px', height: '123px' }} />

          <View style={styles.background}>
            <Text style={styles.cabText}> Sistema de Mapa de Bordo</Text>
          </View>

          <View style={styles.background1}>
            <Text style={styles.titulos}>A) IDENTIFICAÇÃO</Text>
            <View style={styles.row}>

              <View style={styles.column}>
                <Text style={styles.cabeçalho}>Nome da embarcação: {dados1[0] && dados1[0].nomeEmbarcacao}</Text>
                <Text style={styles.cabeçalho}>Porto de saída: {dados1[0] && dados1[0].portoSaida}</Text>
                <Text style={styles.cabeçalho}>Data de saida: {dados1[0] && dados1[0].dataSaida}</Text>
              </View>

              <View>
                <Text style={styles.cabeçalho}>Empresa/Armador: {dados1[0] && dados1[0].empresaArmador}</Text>
                <Text style={styles.cabeçalho}>Porto de chegada: {dados1[0] && dados1[0].portoChegada}</Text>
                <Text style={styles.cabeçalho}>Data de chegada: {dados1[0] && dados1[0].dataChegada}</Text>
              </View>
            </View>


            <Text style={styles.titulos}>B) DADOS DE ESFORÇO</Text>
            <View style={styles.table}>
              {/* Linha 1 */}

              <View style={styles.tableRow}>
                <Text style={styles.tableCell1}></Text>
                <Text style={styles.tableCell3}>Lance 1°</Text>
                <Text style={styles.tableCell3}>Lance 2°</Text>
                <Text style={styles.tableCell3}>Lance 3°</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableCell1}>Discriminação</Text>
                <Text style={styles.tableCell}>Lançamento</Text>
                <Text style={styles.tableCell}>Recolhimento</Text>
                <Text style={styles.tableCell}>Lançamento</Text>
                <Text style={styles.tableCell}>Recolhimento</Text>
                <Text style={styles.tableCell}>Lançamento</Text>
                <Text style={styles.tableCell}>Recolhimento</Text>
              </View>

              <View style={styles.tableRow}>

                <View style={styles.tableColumn}>
                  <Text style={styles.tableRow1}>Data(mês/dia)</Text>
                  <Text style={styles.tableRow1}>Hora/min (inicial)</Text>
                  <Text style={styles.tableRow1}>Hora/min (final) </Text>
                  <Text style={styles.tableRow1}> N° de Anzóis</Text>
                  <Text style={styles.tableRow1}> N° de Samburás</Text>
                  <Text style={styles.tableRow1}>Temp de Superficie</Text>
                  <Text style={styles.tableRow1}>Profundidade(m)</Text>
                  <Text style={styles.tableRow1}>Latitude(inicial)N/S</Text>
                  <Text style={styles.tableRow1}>Longitude(inicial) W</Text>
                  <Text style={styles.tableRow1}>Tipo de isca</Text>
                  <Text style={styles.tableRow1}>Light-stick(sim/não)</Text>
                </View>

                {dados1.map((_, lance) => (
                  lance < 3 ? (
                    <>
                      <View key={lance} style={styles.tableColumn}>
                        <Text style={styles.tableLance}>{dados1[lance] && dados1[lance].dataLance}</Text>
                        <Text style={styles.tableLance}>{dados1[lance] && dados1[lance].horaLancamento}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].horaRecolhimento}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].armadilhasLancadas}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].armadilhasRecolhidas}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].peso}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].profundidade}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].latitude}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].longitude}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].id_isca}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].id_fundo}</Text>

                      </View>
                      <View key={lance} style={styles.tableColumn}>
                        <Text style={styles.tableLance}>{dados1[lance] && dados1[lance].dataLanceR}</Text>
                        <Text style={styles.tableLance}>{dados1[lance] && dados1[lance].horaLancamentoR}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].horaRecolhimentoR}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].armadilhasLancadasR}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].armadilhasRecolhidasR}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].pesoR}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].profundidadeR}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].latitudeRec}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].longitudeRec}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].id_iscaR}</Text>
                        <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].id_fundoR}</Text>
                      </View>
                    </>
                  ) : (
                    <View key={lance}></View>
                  )
                ))}
              </View>
            </View>

            <Text style={styles.titulos}>C) DADOS DE CAPTURA</Text>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell2}></Text>
                {dados1.map((_, lanceIndex) => (
                  lanceIndex < 3 ? (
                    <Text key={lanceIndex} style={styles.tableCell3}>Lance {lanceIndex + 1}</Text>
                  ) : (<View></View>)
                ))}
              </View>

              <View style={styles.row}>
                <Text style={styles.tableCell2}>Espécie</Text>
                <Text style={styles.tableCell}>N°</Text>
                <Text style={styles.tableCell}>Kg</Text>
                <Text style={styles.tableCell}>N°</Text>
                <Text style={styles.tableCell}>Kg</Text>
                <Text style={styles.tableCell}>N°</Text>
                <Text style={styles.tableCell}>Kg</Text>
              </View>
              {especieExtras && especieExtras.reduce((tableData, lancesExtras, lanceAtual) => {
                lancesExtras && lancesExtras.forEach(({ nome, quantidade, peso }) => {
                  if ((nome !== undefined || nome !== 'undefined') && quantidade !== null && peso !== null) { // Verifica se os valores são definidos
                    const existingRow = tableData.find(row => row.nome === nome);
                    if (existingRow) {
                      existingRow.lances[lanceAtual * 2] = quantidade; // Adiciona a quantidade
                      existingRow.lances[lanceAtual * 2 + 1] = peso; // Adiciona o peso
                    } else {
                      const newRow = { nome, lances: Array(6).fill('0') };
                      newRow.lances[lanceAtual * 2] = quantidade; // Adiciona a quantidade
                      newRow.lances[lanceAtual * 2 + 1] = peso; // Adiciona o peso
                      tableData.push(newRow);
                    }

                  }
                }); 
                // Adicione as espécies restantes como novas linhas em tableData
                {
                  captura &&
                  captura.forEach(nome => {
                    // Verifique se a espécie já foi adicionada a tableData
                    if (!tableData.find(row => row.nome === nome)) {
                      const newRow = { nome, lances: Array(6).fill('0') };
                      tableData.push(newRow);
                    }
                  });
                }

                tableData.sort((a, b) => {
                  return a.nome.localeCompare(b.nome);
                });
                return tableData;
              }, []).map(({ id, nome, lances }, especieIndex) => {
                if ((nome !== undefined || nome !== 'undefined')) { // Verifica se o nome é definido antes de renderizar
                  return (
                    <View key={especieIndex} style={styles.tableRow}>

                      <Text style={styles.tableRow1}>{nome} </Text>

                      {lances.map((valor, index) => (
                        <Text key={index} style={styles.tableLance}>
                          {valor}
                        </Text>
                      ))}
                    </View>
                  );
                } else {
                  return null; // Se o nome for undefined, retorna null para pular a renderização
                }
              })}
            </View>


            <Text style={styles.titulos}>D) DESCARTES</Text>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell2}></Text>
                {dados1.map((_, lanceIndex) => (
                  lanceIndex < 3 ? (
                    <Text key={lanceIndex} style={styles.tableCell3}>Lance {lanceIndex + 1}</Text>
                  ) : (<View></View>)
                ))}
              </View>

              <View style={styles.row}>
                <Text style={styles.tableCell2}>Espécie</Text>
                <Text style={styles.tableCell}>N°de vivos</Text>
                <Text style={styles.tableCell}>N°de mortos</Text>
                <Text style={styles.tableCell}>N°de vivos</Text>
                <Text style={styles.tableCell}>N°de mortos</Text>
                <Text style={styles.tableCell}>N°de vivos</Text>
                <Text style={styles.tableCell}>N°de mortos</Text>
              </View>

              {descartes && descartes.reduce((tableData, lancesExtras, lanceAtual) => {
                lancesExtras && lancesExtras.forEach(({ nome, vivos, mortos }) => {
                  if ((nome !== undefined || nome !== 'undefined') && vivos !== null && mortos !== null) { // Verifica se os valores são definidos
                    console.log(nome)
                    console.log(vivos)
                    console.log(mortos)
                    const existingRow = tableData.find(row => row.nome === nome);

                    if (existingRow) {
                      existingRow.lances[lanceAtual * 2] = vivos; // Adiciona a vivos
                      existingRow.lances[lanceAtual * 2 + 1] = mortos; // Adiciona o mortos
                    } else if (!existingRow && (nome != 'undefined' || nome != undefined)) {
                      const newRow = { nome, lances: Array(6).fill('0') };
                      newRow.lances[lanceAtual * 2] = vivos; // Adiciona a vivo
                      newRow.lances[lanceAtual * 2 + 1] = mortos; // Adiciona o morto

                      tableData.push(newRow);
                    }
                  }
                });
                // Adicione as espécies restantes como novas linhas em tableData
                {
                  descarte &&
                    descarte.forEach(nome => {
                      // Verifique se a espécie já foi adicionada a tableData
                      if (!tableData.find(row => row.nome === nome)) {
                        const newRow = { nome, lances: Array(6).fill('0') };
                        tableData.push(newRow);
                      }
                    });
                }


                tableData.sort((a, b) => {
                  return a.nome.localeCompare(b.nome);
                });
                return tableData;
              }, []).map(({ id, nome, lances }, especieIndex) => {
                if (nome !== 'undefined') { // Verifica se o nome é definido antes de renderizar
                  return (
                    <View key={especieIndex} style={styles.tableRow}>

                      <Text style={styles.tableRow1}>{nome}</Text>

                      {lances.map((valor, index) => (
                        <Text key={index} style={styles.tableLance}>
                          {valor}
                        </Text>
                      ))}
                    </View>
                  );
                } else {
                  return null; // Se o nome for undefined, retorna null para pular a renderização
                }
              })}
            </View>

            <Text style={styles.titulos}>E) CAPTURAS INCIDENTAIS DE AVES, TARTARUGAS E OUTROS: </Text>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell2}></Text>
                {dados1.map((_, lanceIndex) => (
                  lanceIndex < 3 ? (
                    <Text key={lanceIndex} style={styles.tableCell3}>Lance {lanceIndex + 1}</Text>
                  ) : (<View></View>)
                ))}
              </View>

              <View style={styles.row}>
                <Text style={styles.tableCell2}>Espécie</Text>
                <Text style={styles.tableCell}>Vivos</Text>
                <Text style={styles.tableCell}>Mortos</Text>
                <Text style={styles.tableCell}>Vivos</Text>
                <Text style={styles.tableCell}>Mortos</Text>
                <Text style={styles.tableCell}>Vivos</Text>
                <Text style={styles.tableCell}>Mortos</Text>
              </View>

              {incidentais && incidentais.reduce((tableData, lancesExtras, lanceAtual) => {
                lancesExtras && lancesExtras.forEach(({ nome, vivos, mortos }) => {
                  if ((nome !== undefined || nome !== 'undefined') && vivos !== null && mortos !== null) { // Verifica se os valores são definidos

                    const existingRow = tableData.find(row => row.nome === nome);

                    if (existingRow) {
                      existingRow.lances[lanceAtual * 2] = vivos; // Adiciona a quantidade
                      existingRow.lances[lanceAtual * 2 + 1] = mortos; // Adiciona o mortos
                    } else {
                      const newRow = { nome, lances: Array(6).fill('0') };
                      newRow.lances[lanceAtual * 2] = vivos; // Adiciona a quantidade
                      newRow.lances[lanceAtual * 2 + 1] = mortos; // Adiciona o morto
                      tableData.push(newRow);
                    }
                  }
                });

                return tableData;
              }, []).map(({ id, nome, lances }, especieIndex) => (
                <View key={especieIndex} style={styles.tableRow}>

                  <Text style={styles.tableRow1}>{nome}</Text>

                  {lances.map((valor, index) => (
                    <Text key={index} style={styles.tableLance}>
                      {valor}
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            <Text style={styles.titulos}>F) RESPONSÁVEL PELO PREENCHIMENTO</Text>

            <View style={styles.rowWhite}>
              <View style={styles.column}>
                <Text style={styles.textWhiteR}>NOME DO MESTRE: __________________________ </Text>
                <Text style={styles.textWhiteR}>ASS: _______________________________________</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.textWhiteL}>N° DE REGISTRO SEAP/PR: ______________________</Text>
                <Text style={styles.textWhiteL}>N° DE INSCR. CAP. PORTOS: _____________________</Text>
              </View>
            </View>

          </View>
        </Page>
      </Document>
    ) : (
      <View></View>
    )

  );
};


export default PdfEspinhel;
