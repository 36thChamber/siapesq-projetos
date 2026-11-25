from pathlib import Path
import json

base=Path('/mnt/a/apis-insetos-17/2026-11-10')
run=base/'publicacao_ste_2026-11-11'
report=json.loads((run/'publication_complete.json').read_text())
receipt=json.loads((run/'publication_receipt.json').read_text())
assert report['status']=='published_and_sha256_verified'
assert report['scenarios']==17 and report['payload_objects']==103 and report['scenario_markers']==17
assert receipt['summary']['verified']
prefix='s3://'+report['bucket']+'/'
lines=['Apis mellifera - caminhos publicados no STE',
       'Publicacao verificada por releitura integral e SHA-256: '+report['verified_utc'],
       '17 cenarios; 51 GeoTIFFs e 34 JSONs de resultado; ocorrencias historicas junto de cada cenario.',
       'Nenhuma permissao de acesso foi alterada. O bucket continua usando suas permissoes existentes.',
       'Publicacao de arquivos nao significa validacao cientifica nem atualizacao do banco/frontend.',
       '', 'Pasta principal: '+prefix+report['prefix']+'/',
       'Manifesto de publicacao: '+prefix+receipt['summary']['key'],
       'Fonte de ocorrencias: '+prefix+'species-table/Occurrence_Apis_mellifera_10_11_26.csv',
       '']
for marker in sorted(report['markers'], key=lambda m:m['scenario']):
    scenario=marker['scenario']
    local=json.loads((run/(scenario+'_complete.json')).read_text())
    lines += [scenario+' | Triagem automatica: '+local['coherence']['veredito']]
    for f in sorted((o for o in report['objects'] if o['scenario']==scenario),key=lambda f:f['key']):
        lines.append(prefix+f['key'])
    lines += ['Manifesto: '+prefix+marker['key'],'']
lines += ['Notas para o front:',
          '- O mesmo CSV de 4610 ocorrencias historicas acompanha todos os cenarios. Nao somar essas copias nem apresenta-las como ocorrencias futuras.',
          '- O CSV original inclui pontos fora do Brasil/area M. O conjunto misto local possui 2721 presencas (sp=1) e 2721 pseudoausencias geradas (sp=0). Pseudoausencias nao devem ser mostradas como ocorrencias.',
          '- Treino final com preditores completos: 1751 presencas e 1751 pseudoausencias. Nao confundir esse total com o CSV de 4610 registros.',
          '- Triagem: 1 APROVADO, 14 SUSPEITOS e 2 REPROVADOS. Fevereiro e marco foram reprovados. Publicacao preserva esses avisos.',
          '- Ausencia desigual de AWC e extrapolacao elevada em alguns cenarios permanecem ressalvas cientificas.',
          '', 'Fotos GBIF:',
          'Catalogo existente confirmado: s3://example-bucket/species-images/gbif/catalog.json',
          'Apresentava 34 especies/335 imagens; Apis ainda ausente na consulta desta tarefa. Nenhuma foto adicionada.',
          'Pacote de integracao historico: s3://example-bucket/species-images/gbif/integration/siapesq-species-images-front.zip',
          'As imagens sao privadas: usar o backend e os campos de autoria/licenca/origem do catalogo.']
out=base/'relatorio_entrega'/'APIS_CAMINHOS_PUBLICADOS_STE_2026-11-11.txt'
out.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(out)
