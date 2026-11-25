#!/usr/bin/env python3
# gerar_codigo_completo.py — (re)gera `documentation/CODIGO_COMPLETO_PIPELINE.md`
#
# O compêndio de código do pipeline (~15 mil linhas) era mantido À MÃO e, por isso,
# envelhecia a cada mudança no código — descrevendo um pipeline que já não existia.
# Este script o RECONSTRÓI a partir dos arquivos do repositório, na ordem de execução.
#
# A lista de arquivos abaixo (SECOES) é a fonte da verdade do que entra no compêndio e
# em que ordem. Ao criar um arquivo novo no pipeline, acrescente-o na seção certa.
#
# EXECUTE DA RAIZ DO PROJETO:
#   python 05_utils/gerar_codigo_completo.py
#   python 05_utils/gerar_codigo_completo.py --check   # só confere se está atualizado
#                                                      # (útil em CI/pre-commit; sai != 0)

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAIDA = ROOT / "documentation" / "CODIGO_COMPLETO_PIPELINE.md"

# Ordem de execução do pipeline. (título da seção, [arquivos])
SECOES: list[tuple[str, list[str]]] = [
    ('0. Orquestrador — um comando (run_pipeline.py)', [
        'run_pipeline.py',
        'naming.py',
    ]),
    ('1. Etapa 1 — Ocorrências: núcleo (occurrences/)', [
        '01_data_acquisition/occurrences/__init__.py',
        '01_data_acquisition/occurrences/__main__.py',
        '01_data_acquisition/occurrences/base.py',
        '01_data_acquisition/occurrences/cache.py',
        '01_data_acquisition/occurrences/cleaner.py',
        '01_data_acquisition/occurrences/config.py',
        '01_data_acquisition/occurrences/deduplicator.py',
        '01_data_acquisition/occurrences/exporter.py',
        '01_data_acquisition/occurrences/http.py',
        '01_data_acquisition/occurrences/logs.py',
        '01_data_acquisition/occurrences/manager.py',
        '01_data_acquisition/occurrences/merger.py',
        '01_data_acquisition/occurrences/models.py',
        '01_data_acquisition/occurrences/validator.py',
    ]),
    ('1. Etapa 1 — Ocorrências: provedores por fonte (occurrences/providers/)', [
        '01_data_acquisition/occurrences/providers/__init__.py',
        '01_data_acquisition/occurrences/providers/_stub.py',
        '01_data_acquisition/occurrences/providers/atlas_australia/provider.py',
        '01_data_acquisition/occurrences/providers/bien/provider.py',
        '01_data_acquisition/occurrences/providers/bold/provider.py',
        '01_data_acquisition/occurrences/providers/dryad/provider.py',
        '01_data_acquisition/occurrences/providers/ebird/provider.py',
        '01_data_acquisition/occurrences/providers/emodnet/provider.py',
        '01_data_acquisition/occurrences/providers/figshare/provider.py',
        '01_data_acquisition/occurrences/providers/gbif/provider.py',
        '01_data_acquisition/occurrences/providers/ices/provider.py',
        '01_data_acquisition/occurrences/providers/idigbio/provider.py',
        '01_data_acquisition/occurrences/providers/inaturalist/provider.py',
        '01_data_acquisition/occurrences/providers/noaa/provider.py',
        '01_data_acquisition/occurrences/providers/obis/provider.py',
        '01_data_acquisition/occurrences/providers/pangaea/provider.py',
        '01_data_acquisition/occurrences/providers/sibbr/provider.py',
        '01_data_acquisition/occurrences/providers/specieslink/provider.py',
        '01_data_acquisition/occurrences/providers/vertnet/provider.py',
        '01_data_acquisition/occurrences/providers/zenodo/provider.py',
    ]),
    ('1. Etapa 1 — Limpeza/filtragem (cleaning/)', [
        '01_data_acquisition/cleaning/__init__.py',
        '01_data_acquisition/cleaning/config.py',
        '01_data_acquisition/cleaning/occurrence_cleaner.py',
        '01_data_acquisition/cleaning/reference_data.py',
    ]),
    ('1b. Etapa 1 — Downloaders ambientais por download (marinho/clima)', [
        '01_data_acquisition/downloader.py',
        '01_data_acquisition/downloaders/__init__.py',
        '01_data_acquisition/downloaders/cdsapi.py',
        '01_data_acquisition/downloaders/coperniocusmarine.py',
        '01_data_acquisition/downloaders/depth.py',
        '01_data_acquisition/downloaders/depth_GEBCO.py',
        '01_data_acquisition/downloaders/gbif.py',
        '01_data_acquisition/downloaders/ndvi_modis.py',
        '01_data_acquisition/downloaders/oceancolor.py',
        '01_data_acquisition/downloaders/opentopograpy.py',
        '01_data_acquisition/downloaders/sdtb.py',
    ]),
    ('2. Etapa 2 — Pseudo-ausências', [
        '02_pseudoabsence/area_m.py',
        '02_pseudoabsence/gen_pseudo_occurences.py',
        '02_pseudoabsence/plot_dados.py',
        '02_pseudoabsence/radius_checker_utils.py',
        '02_pseudoabsence/resolve_ecoregions.py',
    ]),
    ('3. Etapa 3 — Captura de variáveis ambientais (por ponto, na nuvem)', [
        '03_environmental_processing/captura_ambiental.py',
        '03_environmental_processing/captura_ambiental_simultaneo.py',
        '03_environmental_processing/point_sampler.py',
        '03_environmental_processing/env_providers/__init__.py',
        '03_environmental_processing/env_providers/_dem.py',
        '03_environmental_processing/env_providers/altitude.py',
        '03_environmental_processing/env_providers/base.py',
        '03_environmental_processing/env_providers/era5.py',
        '03_environmental_processing/env_providers/legendas_uso_solo.py',
        '03_environmental_processing/env_providers/mapbiomas.py',
        '03_environmental_processing/env_providers/ndvi.py',
        '03_environmental_processing/env_providers/slope.py',
        '03_environmental_processing/env_providers/soilgrids.py',
        '03_environmental_processing/env_providers/sdtb.py',
        '03_environmental_processing/env_providers/uso_solo.py',
        '03_environmental_processing/env_providers/worldcover.py',
        '03_environmental_processing/ocup_solo_worldCover.py',
        '03_environmental_processing/geotiff_extractor.py',
        '03_environmental_processing/gerar_cache_brasil.py',
    ]),
    ('3b. Etapa 3 — QC ambiental / SDM Readiness (processo.py + qc/)', [
        '03_environmental_processing/processo.py',
        '03_environmental_processing/qc/__init__.py',
        '03_environmental_processing/qc/categoricas.py',
        '03_environmental_processing/qc/cobertura.py',
        '03_environmental_processing/qc/correlacao.py',
        '03_environmental_processing/qc/dados.py',
        '03_environmental_processing/qc/descritiva.py',
        '03_environmental_processing/qc/integridade.py',
        '03_environmental_processing/qc/interpretacao.py',
        '03_environmental_processing/qc/limiares.py',
        '03_environmental_processing/qc/multicolinearidade.py',
        '03_environmental_processing/qc/outliers.py',
        '03_environmental_processing/qc/pca.py',
        '03_environmental_processing/qc/plots.py',
        '03_environmental_processing/qc/readiness.py',
        '03_environmental_processing/qc/report.py',
    ]),
    ('4. Etapa 4 — Modelagem e geração das predições (R)', [
        '04_modeling/utils.r',
    ]),
]

LANG = {".py": "python", ".r": "r", ".R": "r", ".sh": "bash", ".yaml": "yaml", ".yml": "yaml"}


def _ancora(caminho: str) -> str:
    """Âncora no estilo do GitHub para um heading `### \\`caminho\\``."""
    return "#" + "".join(c for c in caminho.lower() if c.isalnum())


def _cerca(codigo: str) -> str:
    """Cerca de código longa o bastante para não ser fechada por ``` dentro do arquivo."""
    n = 3
    for linha in codigo.splitlines():
        s = linha.strip()
        if s.startswith("`" * 3):
            n = max(n, len(s) - len(s.lstrip("`")) + 1)
    return "~" * max(n + 1, 4)


def descobrir_ausentes() -> list[str]:
    """
    Arquivos .py do pipeline que NÃO estão em SECOES — rede de segurança contra esquecer
    de acrescentar um arquivo novo ao compêndio.

    Fora do compêndio DE PROPÓSITO (não são código do pipeline, e listá-los faria o aviso
    gritar sempre — e um aviso que grita sempre ninguém lê):
      - `providers/*/__init__.py`: re-exportação de 2 linhas, sem lógica
      - `example_usage.py`: exemplo, não faz parte da execução
    """
    listados = {f for _, fs in SECOES for f in fs}
    pastas = ["01_data_acquisition", "02_pseudoabsence", "03_environmental_processing"]
    achados = []
    for pasta in pastas:
        for p in sorted((ROOT / pasta).rglob("*.py")):
            rel = p.relative_to(ROOT).as_posix()
            if "__pycache__" in rel or rel in listados:
                continue
            if p.name == "example_usage.py":
                continue
            if p.name == "__init__.py" and "/providers/" in rel and rel.count("/") >= 4:
                continue  # shim de provedor
            achados.append(rel)
    return achados


def gerar() -> str:
    blocos, indice = [], []
    total_linhas = total_arqs = 0

    for titulo, arquivos in SECOES:
        indice.append(f"- **{titulo}**")
        blocos.append(f"## {titulo}")
        for rel in arquivos:
            p = ROOT / rel
            if not p.exists():
                print(f"  [aviso] listado em SECOES mas nao existe: {rel}", file=sys.stderr)
                continue
            codigo = p.read_text(encoding="utf-8", errors="replace").rstrip("\n")
            n = len(codigo.splitlines())
            total_linhas += n
            total_arqs += 1
            indice.append(f"  - [`{rel}`]({_ancora(rel)}) — {n} linhas")
            cerca = _cerca(codigo)
            blocos.append(f"### `{rel}`\n\n_{n} linhas_\n\n"
                          f"{cerca}{LANG.get(p.suffix, '')}\n{codigo}\n{cerca}")

    cabecalho = f"""# Código Completo do Pipeline SDM — da captação de dados à geração das predições

> **Compêndio de código-fonte** de todo o pipeline atual, na ordem de execução
> (ocorrências → limpeza → pseudo-ausências → captura ambiental → QC → modelagem/predição).
>
> **GERADO AUTOMATICAMENTE** por `05_utils/gerar_codigo_completo.py` a partir dos arquivos do
> repositório — **não edite este arquivo à mão**: rode o gerador de novo. A fonte da verdade é
> sempre o código no repositório.
>
> **Total: {total_linhas} linhas em {total_arqs} arquivos.** Para o fluxo *explicado* (não o
> código), veja `00_visao_geral_documentacao.md` e o `MASTER_DOCUMENTATION.md`; para rodar,
> `GUIA_DO_COLABORADOR.md` (raiz).

## Índice

"""
    return cabecalho + "\n".join(indice) + "\n\n---\n\n" + "\n\n".join(blocos) + "\n"


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="(Re)gera o CODIGO_COMPLETO_PIPELINE.md.")
    ap.add_argument("--check", action="store_true",
                    help="Não escreve: só confere se o arquivo está atualizado (sai != 0 se não).")
    args = ap.parse_args()

    ausentes = descobrir_ausentes()
    if ausentes:
        print("[aviso] arquivos .py do pipeline FORA do compêndio (adicione-os em SECOES):",
              file=sys.stderr)
        for a in ausentes:
            print(f"          {a}", file=sys.stderr)

    novo = gerar()
    atual = SAIDA.read_text(encoding="utf-8") if SAIDA.exists() else ""

    if args.check:
        if novo == atual:
            print(f"OK: {SAIDA.relative_to(ROOT)} esta atualizado.")
            sys.exit(0)
        print(f"DESATUALIZADO: rode `python 05_utils/gerar_codigo_completo.py`.", file=sys.stderr)
        sys.exit(1)

    SAIDA.write_text(novo, encoding="utf-8")
    n = len(novo.splitlines())
    print(f"OK: {SAIDA.relative_to(ROOT)} regenerado ({n} linhas).")
