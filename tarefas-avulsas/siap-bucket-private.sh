#!/bin/sh
# Consulta a política de acesso anônimo do bucket de relatórios.
set -e
set -eu
: "${MC_ALIAS:?Informe um alias do MinIO Client já configurado}"
mc anonymous get "$MC_ALIAS/${BUCKET:?Informe BUCKET}"
