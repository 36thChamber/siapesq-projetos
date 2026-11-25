#!/bin/sh
# Consulta a capacidade e o espaço disponível no volume de dados.
set -e
df -Pk "${1:?Informe o volume}" | tail -1
