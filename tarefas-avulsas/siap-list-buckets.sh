#!/bin/sh
# Lista os buckets disponíveis no MinIO com o acesso configurado.
set -e
set -eu
: "${MC_ALIAS:?Informe um alias do MinIO Client já configurado}"
mc ls "$MC_ALIAS"
