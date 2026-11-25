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
    fontWeight: 'bold'
  },
  titulos: {
    fontSize: '12px',
    padding: 8,
    fontWeight: 'bold'

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
const PdfEmalhe = (dadosMapa) => {
  const dados1: any[] = [
    (dadosMapa && dadosMapa?.dadosMapa?.lance1) || null,
    (dadosMapa && dadosMapa?.dadosMapa?.lance2) || null,
    (dadosMapa && dadosMapa?.dadosMapa?.lance3) || null,
    (dadosMapa && dadosMapa?.dadosMapa?.lance4) || null,
    (dadosMapa && dadosMapa?.dadosMapa?.lance5) || null,
    (dadosMapa && dadosMapa?.dadosMapa?.lance6) || null
  ];
  const especieExtras = [
    (dados1[0] && dados1[0].especiesExtras) || null,
    (dados1[1] && dados1[1].especiesExtras) || null,
    (dados1[2] && dados1[2].especiesExtras) || null,
    (dados1[3] && dados1[3].especiesExtras) || null,
    (dados1[4] && dados1[4].especiesExtras) || null,
    (dados1[5] && dados1[5].especiesExtras) || null
  ];

  const incidentais = [
    (dados1[0] && dados1[0].dados_incidentais) || null,
    (dados1[1] && dados1[1].dados_incidentais) || null,
    (dados1[2] && dados1[2].dados_incidentais) || null,
    (dados1[3] && dados1[3].dados_incidentais) || null,
    (dados1[4] && dados1[4].dados_incidentais) || null,
    (dados1[5] && dados1[5].dados_incidentais) || null
  ];

  const especiesEmalhe = [
    "Abrótea",
    "Abrótea-do-fundo",
    "Bagre",
    "Batata",
    "Batata-da-pedra",
    "Betara / Papa-terra",
    "Cabrinha",
    "Cação anequim / moro",
    "Cação anjo",
    "Cação azul / mole-mole",
    "Cação bagre",
    "Cação bico-doce",
    "Cação cabeça-chata",
    "Cação cola-fina",
    "Cação-de-espinho",
    "Cação frango",
    "Cação martelo",
    "Cação machote",
    "Cação mangona",
    "Cação viola",
    "Caranguejo aranha",
    "Caranguejo real",
    "Castanha",
    "Cavalinha",
    "Cherne poveiro",
    "Cherne verdadeiro",
    "Cherne galha-amarela",
    "Cherne queimado",
    "Cherne listrado",
    "Congro",
    "Congro-rosa",
    "Corvina",
    "Dourado",
    "Enchova",
    "Espada",
    "Galo",
    "Galo-do-fundo",
    "Garoupa",
    "Goete",
    "Gordinho",
    "Guaivira",
    "Linguado",
    "Merluza",
    "Namorado",
    "Olhudo / Barbudo",
    "Pargo rosa",
    "Peixe sapo",
    "Pescada branca",
    "Pescada cambucu",
    "Pescada foguete",
    "Pescada olhuda",
    "Raia chita",
    "Raia emplasto",
    "Raia manta",
    "Tainha"
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
                <Text style={styles.tableCell1}>Discriminação</Text>
                <Text style={styles.tableCell}>Lance 1°</Text>
                <Text style={styles.tableCell}>Lance 2°</Text>
                <Text style={styles.tableCell}>Lance 3°</Text>
                <Text style={styles.tableCell}>Lance 4°</Text>
                <Text style={styles.tableCell}>Lance 5°</Text>
                <Text style={styles.tableCell}>Lance 6°</Text>
              </View>

              <View style={styles.tableRow}>

                <View style={styles.tableColumn}>
                  <Text style={styles.tableRow1}>Data</Text>
                  <Text style={styles.tableRow1}>Hora (inicial)</Text>
                  <Text style={styles.tableRow1}>Hora (final) </Text>
                  <Text style={styles.tableRow1}>Comprimento total da rede(m)</Text>
                  <Text style={styles.tableRow1}>Altura total da rede(m)</Text>
                  <Text style={styles.tableRow1}>Tamanho da Malha(cm)</Text>
                  <Text style={styles.tableRow1}>Profundidade</Text>
                  <Text style={styles.tableRow1}>Latitude</Text>
                  <Text style={styles.tableRow1}>Longitude</Text>
                </View>

                {dados1.map((_, lance) => (
                  lance < 6 ? (<View key={lance} style={styles.tableColumn}>

                    <Text style={styles.tableLance}>{dados1[lance] && dados1[lance].dataLance}</Text>
                    <Text style={styles.tableLance}>{dados1[lance] && dados1[lance].horaLancamento}</Text>
                    <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].horaRecolhimento}</Text>
                    <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].armadilhasLancadas}</Text>
                    <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].armadilhasRecolhidas}</Text>
                    <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].peso}</Text>
                    <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].profundidade}</Text>
                    <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].latitude}</Text>
                    <Text style={styles.tableLance}> {dados1[lance] && dados1[lance].longitude}</Text>
                  </View>) : (<View></View>)
                ))}
              </View>
            </View>

            <Text style={styles.titulos}>C) DADOS DE CAPTURA</Text>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell2}></Text>
                {dados1.map((_, lanceIndex) => (
                  lanceIndex < 6 ? (
                    <Text key={lanceIndex} style={styles.tableCell}>Lance {lanceIndex + 1}</Text>
                  ) : (<View></View>)
                ))}
              </View>

              <View style={styles.row}>
                <Text style={styles.tableCell2}>Espécie</Text>
                <Text style={styles.tableCell}>Peso(kg)</Text>
                <Text style={styles.tableCell}>Peso(kg)</Text>
                <Text style={styles.tableCell}>Peso(kg)</Text>
                <Text style={styles.tableCell}>Peso(kg)</Text>
                <Text style={styles.tableCell}>Peso(kg)</Text>
                <Text style={styles.tableCell}>Peso(kg)</Text>
              </View>

              {especieExtras && especieExtras.reduce((tableData, lancesExtras, lanceAtual) => {
                lancesExtras && lancesExtras.forEach(({ id, nome, peso }) => {
                  if ((nome !== undefined || nome !== 'undefined') && peso != null) {
                    const existingRow = tableData.find(row => row.nome === nome);

                    if (existingRow) {
                      existingRow.lances[lanceAtual] = peso;
                    } else {
                      const newRow = { nome, lances: Array(6).fill('0') };
                      newRow.lances[lanceAtual] = peso;
                      tableData.push(newRow);
                    }
                  }

                });

                // Adicione as espécies restantes como novas linhas em tableData
                {
                  especiesEmalhe &&
                    especiesEmalhe.forEach(nome => {
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

                      {lances.map((peso, lanceIndex) => (
                        <Text key={lanceIndex} style={styles.tableLance}>
                          {peso}
                        </Text>
                      ))}
                    </View>
                  );
                } else {
                  return (null);
                }
              })}
            </View>

            <Text style={styles.titulos}>D)CAPTURAS INCIDENTAIS DE TARTARUGAS E MAMÍFEROS:</Text>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell2}></Text>
                {dados1.map((_, lanceIndex) => (
                  lanceIndex < 6 ? (
                    <Text key={lanceIndex} style={styles.tableCell}>Lance {lanceIndex + 1}</Text>
                  ) : (<View></View>)
                ))}
              </View>

              {incidentais && incidentais.reduce((tableData, lancesExtras, lanceAtual) => {
                lancesExtras && lancesExtras.forEach(({ nome, quantidade }) => {
                  const existingRow = tableData.find(row => row.nome === nome);

                  if (existingRow) {
                    existingRow.lances[lanceAtual] = quantidade;
                  } else {
                    const newRow = { nome, lances: Array(6).fill('0') };
                    newRow.lances[lanceAtual] = quantidade;
                    tableData.push(newRow);
                  }
                });

                return tableData;
              }, []).map(({ id, nome, lances }, especieIndex) => {
                if (nome !== 'undefined') { // Verifica se o nome é definido antes de renderizar
                  return (
                    <View key={especieIndex} style={styles.tableRow}>

                      <Text style={styles.tableRow1}>{nome}</Text>

                      {lances.map((quantidade, lanceIndex) => (
                        <Text key={lanceIndex} style={styles.tableLance}>
                          {quantidade}
                        </Text>
                      ))}
                    </View>
                  );
                } else {
                  return (null);
                }
              })}
            </View>

            <Text style={styles.titulos}>E) RESPONSÁVEL PELO PREENCHIMENTO</Text>

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


export default PdfEmalhe;
