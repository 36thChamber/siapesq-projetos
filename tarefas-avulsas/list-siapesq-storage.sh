#!/bin/sh
# Cria uma política de listagem de bucket no MinIO e a atribui a um usuário. Altera permissões.
set -e
set -eu
: "${MC_ALIAS:?Informe o alias do MinIO Client}" "${BUCKET:?Informe o bucket}" "${POLICY_NAME:?Informe a política}" "${READER_USER:?Informe o usuário}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# A permissão autoriza listagem somente no bucket informado.
python3 - "$BUCKET" "$tmp/policy.json" <<'PY'
import json
import re
import sys
from pathlib import Path

bucket, path = sys.argv[1:]
if not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", bucket):
    raise ValueError("Nome de bucket inválido")
policy = {"Version": "2012-10-17", "Statement": [
    {"Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": ["arn:aws:s3:::" + bucket]}
]}
Path(path).write_text(json.dumps(policy))
PY
mc admin policy create "$MC_ALIAS" "$POLICY_NAME" "$tmp/policy.json"
mc admin policy attach "$MC_ALIAS" "$POLICY_NAME" --user "$READER_USER"
