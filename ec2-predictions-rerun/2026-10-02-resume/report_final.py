from pathlib import Path
from collections import Counter
import csv, datetime, json

BASE = Path(__file__).resolve().parent
RS = Path('/workspace/ec2-predictions-exclusive/2026-10-02')
common = json.loads((BASE / 'auditoria_final.json').read_text())
rs = json.loads((RS / 'auditoria_final.json').read_text())
cfg = json.loads((BASE / 'config.json').read_text())
deployment_initial = json.loads((BASE / 'deployment.json').read_text())
rs_deploy = json.loads((RS / 'deployment.json').read_text())
assert common['status'] == rs['status'] == 'verified_complete'
assert common['markers_verified'] == 102 and common['objects_verified'] == 510
assert rs['markers_verified'] == 68 and rs['objects_verified'] == 340
assert common.get('instance_stopped_verified_utc')
rows = []
for batch, audit in [('exclusivas_RS', rs), ('comuns_refeitas', common)]:
    record_map = {(r['species'],r['scenario']):r for r in audit['summary']['records']}
    for marker in audit['markers']:
        train = marker['methodology']
        record = record_map[(marker['species'],marker['scenario'])]
        rows.append({'batch':batch,'species':marker['species'],'scenario':marker['scenario'],
                     'verdict':marker['coherence']['veredito'],'profile':train['perfil'],
                     'presence':train['class_counts']['1'],'absence':train['class_counts']['0'],
                     'seconds_latest_attempt':round(record['seconds'],2),
                     'model_sha256':marker['model_sha256'],'finished_utc':marker['finished_utc']})
assert len(rows) == 170
rows.sort(key=lambda x:(x['batch'],x['species'],x['scenario']))
with (BASE / 'avaliacoes_finais.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
table=['| Espécie | REPROVADO antes | APROVADO agora | SUSPEITO agora | REPROVADO agora | Presenças / ausências |',
       '|---|---:|---:|---:|---:|---:|']
for item in cfg['species']:
    sp=item['species'];v=common['by_species'][sp]
    t=next(m['methodology'] for m in common['markers'] if m['species']==sp)
    table.append(f"| {sp.replace('_',' ')} | {item['source_negative']} | {v.get('APROVADO',0)} | {v.get('SUSPEITO',0)} | {v.get('REPROVADO',0)} | {t['class_counts']['1']} / {t['class_counts']['0']} |")
start=datetime.datetime.fromisoformat(rs_deploy['started_utc'])
stop=datetime.datetime.fromisoformat(common['instance_stopped_verified_utc'])
hours=(stop-start).total_seconds()/3600
compute=hours*cfg['hourly_usd']
text=f'''# RS: prioridade e retomada concluídas

Foram concluídos e verificados os 68 cenários das quatro exclusivas de RS e os 102 cenários das seis comuns selecionadas para refazer. São 170 marcadores e 850 arquivos de resultado conferidos no S3 (510 TIFFs, 340 JSONs); zero falhas de execução nos dois resumos finais. Perfis, treino em 1:1, código, modelos, tamanhos e metadados SHA-256 foram conferidos. Os TIFFs passaram pela leitura integral no worker antes da publicação.

A prioridade foi respeitada: as seis comuns começaram em {deployment_initial['run_started_utc']}, após a conclusão das quatro exclusivas em {rs['summary']['finished_utc']}. A EC2 `{cfg['instance_id']}` foi confirmada parada em {common['instance_stopped_verified_utc']}.

{chr(10).join(table)}

As quatro exclusivas terminaram com 19 SUSPEITO e 49 REPROVADO: Butia eriospatha 17 SUSPEITO; Acromyrmex crassispinus 2 SUSPEITO e 15 REPROVADO; Alouatta caraya e Didelphis albiventris 17 REPROVADO cada. Treinos: 40/40, 11/11, 501/501 e 1890/1890, respectivamente. Acromyrmex crassispinus ficou abaixo das 15–25 presenças recomendadas no perfil.

Os vereditos são do teste automatizado de coerência ecológica. Concluir a geração e verificar os arquivos não significa aprovação biológica. A seleção para refazer contou exclusivamente REPROVADO e exigiu pelo menos 9/17 no lote original. Os laudos negativos novos foram preservados; outra rodada não foi iniciada automaticamente.

Resultados das quatro: `s3://example-bucket/predicoes_cenarios/exclusivas-rs-2026-10-02-perfil-1x1/`.
Resultados das seis: `s3://{cfg['bucket']}/{cfg['prefix']}/`.

O lote original das 26 comuns permanece preservado. As quatro oceânicas exclusivas de ES continuam adiadas conforme a instrução do usuário. Não houve alteração da planilha ou envio para Drive.

A interrupção anterior foi causada pelo desligamento agendado no gancho de parada do serviço durante um reinício de manutenção. O gancho foi corrigido para permitir manutenção enquanto o lote estiver em andamento. Também foi corrigida a exibição de diretórios externos que retornava erro depois de escrever modelos e laudos. Passaram 27 testes na versão final: 17 de perfil/balanceamento e dez do GBIF. As correções de aquisição incluem timeout explícito, até seis páginas concorrentes por espécie, cache por página para retomada, intervalo de um segundo por pedido/processo e respeito ao Retry-After em 429, ordem determinística e última página limitada para não ultrapassar o teto da API. Consulta, filtros e teto de 100 mil registros foram preservados. Os 34 cenários já concluídos foram retomados com seus hashes e proveniência originais. Os logs das duas manutenções foram preservados em attempts na EC2. O último reinício começou em {common["summary"]["started_utc"]}. Modelos completos desta rodada foram recuperados apenas após validar laudos, SDM com dez réplicas, perfil, semente, proporção e variáveis finitas. Os novos modelos também passaram pela leitura SDM com dez réplicas antes de projetar.

Nas seis comuns, o driver de projeção deixou de serializar uma função que carregava a matriz inteira e todos os blocos para cada processo. Ele mantém as florestas por fork e serializa a função global com 1191 bytes. O teste de equivalência sobre 4000 células e dez RFs reais confirmou médias e desvios padrão idênticos ao driver anterior com dois e quatro processos. A configuração de produção usou duas espécies por vez com 14 workers cada. Hash do driver: `{cfg['prediction_driver_sha256']}`.

Computação estimada para esta ativação completa: até **US$ {compute:.2f}**, com {hours:.3f} h entre ativação e consulta que confirmou a parada, pela tarifa registrada de US$ {cfg['hourly_usd']}/h. Esta é uma estimativa conservadora por tempo, não uma consulta de faturamento; armazenamento e transferência são adicionais. O limite absoluto de oito horas foi mantido, equivalente a US$ 20,45 de computação.

Evidências locais: `auditoria_final.json` contém o resumo e os 102 marcadores das comuns; a auditoria das quatro está em `{RS}/auditoria_final.json`; `avaliacoes_finais.csv` reúne os 170 laudos. O log `tests_final.log` e `performance_equivalence.log` registram as verificações de código.
'''
(BASE / 'RELATORIO_FINAL.md').write_text(text)
deployment=json.loads((BASE / 'deployment.json').read_text())
deployment.update(status='verified_complete',completed_scenarios=102,verified_output_objects=510,
                  verified_utc=common['verified_utc'],instance_stopped_verified_utc=common['instance_stopped_verified_utc'],
                  combined_scenarios_verified=170,combined_output_objects_verified=850,
                  compute_activation_upper_estimate_usd=round(compute,4),final_verdicts=common['by_species'])
(BASE / 'deployment.json').write_text(json.dumps(deployment,indent=2))
print(text)
