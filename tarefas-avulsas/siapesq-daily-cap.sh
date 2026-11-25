#!/bin/sh
# Mostra capacidade de disco, memória total e disponível e quantidade de processadores.
set -e
df -Pk "${1:-.}" | tail -1
awk '/MemTotal:|MemAvailable:/{print}' /proc/meminfo
nproc
