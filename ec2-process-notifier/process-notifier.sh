#!/usr/bin/env bash
set -u

stage="${1:?uso: process-notifier.sh start|finish UNIT APP}"
unit="${2:?unidade systemd ausente}"
application="${3:?nome da aplicacao ausente}"
topic_arn="${PROCESS_NOTIFY_TOPIC_ARN:?configure o ARN do topico SNS}"
region="${AWS_REGION:-sa-east-1}"
host="$(hostname -f 2>/dev/null || hostname)"
now="$(TZ=America/Sao_Paulo date '+%Y-%m-%d %H:%M:%S %Z')"

publish() {
  local subject="$1"
  local message="$2"
  if aws sns publish \
    --region "${region}" \
    --topic-arn "${topic_arn}" \
    --subject "${subject:0:100}" \
    --message "${message}" >/dev/null 2>&1; then
    return 0
  fi

  # Algumas imagens recentes do AWS CLI v2 falham ao carregar o modelo SNS.
  # O boto3 do sistema usa a mesma role IAM da instancia e e o fallback seguro.
  PROCESS_NOTIFY_SUBJECT="${subject:0:100}" \
  PROCESS_NOTIFY_MESSAGE="${message}" \
  PROCESS_NOTIFY_TOPIC="${topic_arn}" \
  PROCESS_NOTIFY_REGION="${region}" \
    python3 - <<'PY'
import os
import boto3

boto3.client("sns", region_name=os.environ["PROCESS_NOTIFY_REGION"]).publish(
    TopicArn=os.environ["PROCESS_NOTIFY_TOPIC"],
    Subject=os.environ["PROCESS_NOTIFY_SUBJECT"],
    Message=os.environ["PROCESS_NOTIFY_MESSAGE"],
)
PY
}

if [[ "${stage}" == "start" ]]; then
  publish "[EM ANDAMENTO] ${application}" "============================================================
                 RELATORIO EXECUTIVO SIAPESQ
============================================================

STATUS         : EM ANDAMENTO
PROCESSO       : ${application}
INICIO         : ${now}
SERVIDOR       : ${host}

O processamento foi iniciado normalmente.
Ao finalizar, sera enviado um relatorio completo com o resultado,
a duracao e os logs tecnicos da execucao.

============================================================"
  exit $?
fi

service_result="${SERVICE_RESULT:-unknown}"
exit_code="${EXIT_CODE:-unknown}"
exit_status="${EXIT_STATUS:-unknown}"
started_epoch="$(systemctl show "${unit}" -p ExecMainStartTimestampMonotonic --value 2>/dev/null || true)"
finished_epoch="$(systemctl show "${unit}" -p ExecMainExitTimestampMonotonic --value 2>/dev/null || true)"
duration="indisponivel"
if [[ "${started_epoch}" =~ ^[0-9]+$ && "${finished_epoch}" =~ ^[0-9]+$ && "${finished_epoch}" -ge "${started_epoch}" ]]; then
  elapsed_seconds=$(((finished_epoch - started_epoch) / 1000000))
  duration="$(printf '%02dh %02dm %02ds' $((elapsed_seconds / 3600)) $(((elapsed_seconds % 3600) / 60)) $((elapsed_seconds % 60)))"
fi

if [[ "${service_result}" == "success" && "${exit_status}" == "0" ]]; then
  label="CONCLUIDO COM SUCESSO"
  subject_label="OK"
  executive_summary="O processamento e todas as etapas monitoradas terminaram corretamente."
else
  label="FALHA - ACAO NECESSARIA"
  subject_label="ATENCAO"
  executive_summary="O processamento nao terminou corretamente. A equipe tecnica deve analisar os logs abaixo."
fi

system_log="$(journalctl -u "${unit}" -n 80 --no-pager -o short-iso 2>/dev/null || true)"
[[ -n "${system_log}" ]] || system_log="Log do systemd indisponivel. Consulte: journalctl -u ${unit}"

application_logs=""
process_details="Detalhamento por item indisponivel. Consulte os logs tecnicos."
if [[ "${unit}" == "acolite-daily.service" ]]; then
  acolite_log="$(tail -n 80 /workspace/logs_acolite.log 2>/dev/null || true)"
  upload_log="$(tail -n 40 /workspace/logs_aws.log 2>/dev/null || true)"
  acolite_result="$(python3 - <<'PY'
import ast
import re
from pathlib import Path

text = Path("/workspace/logs_acolite.log").read_text(errors="replace")
start = text.rfind("INÍCIO ACOLITE:")
current = text[start:] if start >= 0 else text

requested = []
match = re.search(r"Argumentos passados:\s*(\[[^\n]+\])", current)
if match:
    try:
        requested = [str(value) for value in ast.literal_eval(match.group(1))]
    except (ValueError, SyntaxError):
        pass

successful = sorted(set(re.findall(
    r"\[ID\s+(\d+)\]\s+Alertas enviados com sucesso", current
)), key=int)
failed = sorted(set(re.findall(
    r"\[(?:ID\s+)?(\d+)\].*?Erro ao baixar imagens", current
)), key=int)

# Um ID solicitado que nao chegou ao marcador final tambem requer atencao.
incomplete = sorted(set(requested) - set(successful) - set(failed), key=int)
print("REQUESTED=" + ", ".join(requested))
print("SUCCESS=" + ", ".join(successful))
print("FAILED=" + ", ".join(failed))
print("INCOMPLETE=" + ", ".join(incomplete))
PY
)"
  requested_ids="$(sed -n 's/^REQUESTED=//p' <<<"${acolite_result}")"
  successful_ids="$(sed -n 's/^SUCCESS=//p' <<<"${acolite_result}")"
  failed_ids="$(sed -n 's/^FAILED=//p' <<<"${acolite_result}")"
  incomplete_ids="$(sed -n 's/^INCOMPLETE=//p' <<<"${acolite_result}")"
  process_details="IDs solicitados             : ${requested_ids:-nao identificados}
IDs concluídos com sucesso  : ${successful_ids:-nenhum}
IDs com erro                : ${failed_ids:-nenhum}
IDs sem conclusão registrada: ${incomplete_ids:-nenhum}"
  if [[ -n "${failed_ids}${incomplete_ids}" ]]; then
    label="CONCLUIDO PARCIALMENTE - ACAO NECESSARIA"
    subject_label="ATENCAO"
    executive_summary="O Acolite terminou, mas um ou mais IDs apresentaram erro ou nao registraram conclusao."
  fi
  application_logs="
---------------- LOG DO PROCESSAMENTO ACOLITE ----------------
${acolite_log:-Log do Acolite indisponivel.}

------------------ LOG DO ENVIO PARA O S3 --------------------
${upload_log:-Log do upload S3 indisponivel.}"
elif [[ "${unit}" == "siapesq-models-daily.service" ]]; then
  prediction_date="$(sed -n 's/^date=//p' /workspace/models/data/last-successful-s3-run 2>/dev/null | head -1)"
  summary_csv=""
  if [[ -n "${prediction_date}" ]]; then
    summary_csv="$(aws s3 cp "s3://example-bucket/predictions/daily/${prediction_date}/run_summary.csv" - 2>/dev/null || true)"
  fi
  if [[ -n "${summary_csv}" ]]; then
    process_details="$(python3 -c '
import csv, io, sys
rows = list(csv.DictReader(io.StringIO(sys.stdin.read())))
ok = [row["species_id"] for row in rows if row.get("status") == "ok"]
failed = [row["species_id"] for row in rows if row.get("status") != "ok"]
print("Data das predições          : " + ("'"${prediction_date}"'" or "não identificada"))
print("Espécies concluídas (%d)    : %s" % (len(ok), ", ".join(ok) or "nenhuma"))
print("Espécies com erro (%d)      : %s" % (len(failed), ", ".join(failed) or "nenhuma"))
' <<<"${summary_csv}")"
  else
    process_details="Nao foi possivel recuperar o resumo individual das especies."
  fi
fi

publish "[${subject_label}] ${application} - relatorio final" "============================================================
                 RELATORIO EXECUTIVO SIAPESQ
============================================================

STATUS         : ${label}
PROCESSO       : ${application}
TERMINO        : ${now}
DURACAO        : ${duration}
SERVIDOR       : ${host}
CODIGO TECNICO : ${exit_code}/${exit_status}

RESUMO
${executive_summary}

RESULTADO DOS PROCESSOS
${process_details}

============================================================
                     EVIDENCIAS E LOGS
============================================================
${application_logs}

-------------------- LOG DO SERVICO -------------------------
${system_log}

============================================================
Relatorio automatico. Unidade monitorada: ${unit}
============================================================"
