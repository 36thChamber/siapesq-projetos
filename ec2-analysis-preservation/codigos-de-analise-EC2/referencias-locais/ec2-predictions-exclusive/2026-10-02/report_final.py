"""Build the local reviewable report from the verified final audit."""
from pathlib import Path
from collections import Counter
import csv, datetime, json

BASE = Path(__file__).resolve().parent
audit = json.loads((BASE / 'auditoria_final.json').read_text())
cfg = json.loads((BASE / 'config.json').read_text())
deployment = json.loads((BASE / 'deployment.json').read_text())
assert audit['status'] == 'verified_complete'
assert audit['markers_verified'] == 68 and audit['objects_verified'] == 340
assert audit.get('instance_stopped_verified_utc'), 'Verify EC2 stop before the final report'
records = {(r['species'], r['scenario']): r for r in audit['summary']['records']}
rows = []
for marker in sorted(audit['markers'], key=lambda x: (x['species'], x['scenario'])):
    train = marker['methodology']
    record = records[(marker['species'], marker['scenario'])]
    rows.append({'species': marker['species'], 'scenario': marker['scenario'],
                 'verdict': marker['coherence']['veredito'], 'profile': train['perfil'],
                 'presence': train['class_counts']['1'], 'absence': train['class_counts']['0'],
                 'seconds': round(record['seconds'], 2), 'model_sha256': marker['model_sha256'],
                 'finished_utc': marker['finished_utc']})
with (BASE / 'avaliacoes_finais.csv').open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
    writer.writeheader(); writer.writerows(rows)
start = datetime.datetime.fromisoformat(deployment['started_utc'])
finish = datetime.datetime.fromisoformat(audit['instance_stopped_verified_utc'])
hours_upper = (finish - start).total_seconds() / 3600
cost_upper = hours_upper * cfg['hourly_usd']
table = ['| Espécie | Cenários | APROVADO | SUSPEITO | REPROVADO | Presenças / ausências |',
         '|---|---:|---:|---:|---:|---:|']
for sp in cfg['species']:
    subset = [r for r in rows if r['species'] == sp['species']]
    verdicts = Counter(r['verdict'] for r in subset)
    table.append(f"| {sp['species'].replace('_', ' ')} | {len(subset)}/17 | {verdicts['APROVADO']} | {verdicts['SUSPEITO']} | {verdicts['REPROVADO']} | {subset[0]['presence']} / {subset[0]['absence']} |")
text = f'''# RS: lote terrestre concluído e verificado

Verificação final: {audit['verified_utc']}. EC2 parada, verificada em {audit['instance_stopped_verified_utc']}.

Foram concluídos os 68 cenários das quatro espécies exclusivas da lista de RS. A leitura final do S3 confirmou todos os 68 marcadores e os 340 objetos de resultado (204 TIFFs e 136 JSONs), com tamanho e metadados SHA-256 compatíveis. Os TIFFs foram lidos integralmente pelo worker antes de cada publicação. Nenhuma falha de execução permanece no resumo final. Perfis, modelos, versão do código e proporção de treino 1:1 foram conferidos em todos os marcadores.

{chr(10).join(table)}

Os vereditos são do teste automatizado de coerência ecológica. Êxito de execução e integridade dos rasters não são aprovação biológica. O modelo de Acromyrmex crassispinus usa 11 presenças após limpeza, abaixo das 15–25 recomendadas pelo perfil. Não foi iniciada automaticamente outra rodada após estes laudos.

Resultados: `s3://{cfg['bucket']}/{cfg['prefix']}/`. EC2 `{cfg['instance_id']}`, região `{cfg['region']}`, diretório remoto `{cfg['remote_root']}`. Não houve envio para Drive nem alteração da planilha. As quatro oceânicas exclusivas de ES continuam adiadas por instrução de Artur.

O serviço antigo das seis comuns foi interrompido por um desligamento agendado pelo seu gancho de parada durante um reinício de manutenção. Esse gancho foi corrigido no lote de RS para não desligar durante uma parada manual de um lote em andamento. A exibição final de caminhos externos no pipeline também foi corrigida e passou nos 17 testes; os quatro modelos já treinados nesta rodada foram recuperados somente após validar artefatos, parâmetros, balanceamento e dez réplicas SDM. O lote original das 26 comuns continua completo; a rodada nova de seis comuns não foi retomada enquanto RS tinha prioridade.

Computação estimada nesta ativação: até US$ {cost_upper:.2f}, pela tarifa registrada de US$ {cfg['hourly_usd']}/h e {hours_upper:.3f} h entre ativação e confirmação da parada. Este limite conservador usa o horário da consulta que confirmou a parada, não o segundo exato de desligamento. Não é uma leitura do faturamento; armazenamento e transferência são adicionais. O limite previsto de oito horas era US$ 20,45 de computação.

Evidências locais: `auditoria_final.json` contém os marcadores e o resumo, `avaliacoes_finais.csv` contém os 68 laudos e `progress_latest.json` registra o progresso observado.
'''
(BASE / 'RELATORIO_FINAL.md').write_text(text)
deployment.update(status='verified_complete', verified_utc=audit['verified_utc'],
                  instance_stopped_verified_utc=audit['instance_stopped_verified_utc'],
                  completed_scenarios=68, verified_output_objects=340,
                  compute_cost_upper_estimate_usd=round(cost_upper, 4),
                  final_verdicts=audit['by_species'])
(BASE / 'deployment.json').write_text(json.dumps(deployment, indent=2))
print(text)
