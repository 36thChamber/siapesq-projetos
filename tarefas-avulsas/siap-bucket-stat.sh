#!/bin/sh
# Verifica se o bucket de relatórios existe e está acessível.
set -e
set -eu
: "${MC_ALIAS:?Informe um alias do MinIO Client já configurado}"
mc stat "$MC_ALIAS/${BUCKET:?Informe BUCKET}" >/dev/null
echo REPORT_BUCKET_EXISTS
