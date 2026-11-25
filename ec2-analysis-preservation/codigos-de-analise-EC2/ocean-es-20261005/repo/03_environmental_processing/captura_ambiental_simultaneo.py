#!/usr/bin/env python3
# captura_ambiental_simultaneo.py — captação SIMULTÂNEA de variáveis ambientais (etapa 03)
#
# Mesma etapa do `captura_ambiental.py`, com UMA diferença: as variáveis são captadas
# TODAS AO MESMO TEMPO, em vez de uma de cada vez.
#
# POR QUE FUNCIONA (e por que é seguro): cada variável vem de um SERVIDOR DIFERENTE —
#   era5       -> Copernicus/CDS          ndvi      -> NASA/ORNL (MODIS)
#   soilgrids  -> ISRIC                   altitude  -> COP30 na AWS (leitura em nuvem)
#   slope      -> COP30 na AWS            mapbiomas -> raster local
#   worldcover -> nuvem (ESA)
# Elas não disputam fila nem banda entre si, e NENHUMA lê a coluna produzida por outra
# (todas leem só lat/lon e ano/mês/dia). Então o tempo deixa de ser a SOMA e vira o
# MÁXIMO: o ERA5, que leva horas (é a parede da fila do Copernicus, não da nossa banda),
# passa a correr POR BAIXO das demais, que levam minutos. Medido: ~2 h a menos por espécie.
#
# GARANTIA DE INTEGRIDADE: cada variável recebe uma CÓPIA do dataframe e devolve as linhas
# na MESMA ORDEM; o orquestrador confere o nº de linhas antes de anexar e copia as colunas
# por POSIÇÃO. Se alguma devolver tamanho diferente, a coluna é DESCARTADA com aviso — antes
# desalinhar nada do que entregar dado trocado. A ordem das colunas do CSV final vem do
# registry de providers, NÃO de quem terminou primeiro (senão mudaria a cada execução).
#
# VALIDADO: rodada sequencial vs simultânea sobre os mesmos pontos → diferença 0,000e+00 em
# TODAS as colunas e mesmo nº de NaN. A ciência é a mesma; muda só quantas rodam por vez.
#
# O MIOLO É COMPARTILHADO com `captura_ambiental.py` de propósito (`capturar(paralelo=True)`):
# duas cópias do código divergiriam, e uma correção feita numa não chegaria na outra.
#
# Uso (da RAIZ do projeto):
#   python 03_environmental_processing/captura_ambiental_simultaneo.py --especie "Alouatta caraya"
#   python 03_environmental_processing/captura_ambiental_simultaneo.py --csv <sp_...csv>
#
# É o modo PADRÃO do `run_pipeline.py` (use `--sequencial` lá para cair no outro).

from __future__ import annotations

import sys
from pathlib import Path

# Permite rodar como script solto: o irmão `captura_ambiental` precisa estar importável.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from captura_ambiental import capturar, main  # noqa: E402,F401  (capturar é reexportado)


def capturar_simultaneo(csv: Path, variaveis: list[str], data_root: Path, dem_path: str,
                        workers: int, painel_seg: float = 20.0) -> Path:
    """Capta TODAS as variáveis ao mesmo tempo. Ver `capturar()` para os detalhes."""
    return capturar(csv, variaveis, data_root, dem_path, workers,
                    paralelo=True, painel_seg=painel_seg)


if __name__ == "__main__":
    main(paralelo=True)
