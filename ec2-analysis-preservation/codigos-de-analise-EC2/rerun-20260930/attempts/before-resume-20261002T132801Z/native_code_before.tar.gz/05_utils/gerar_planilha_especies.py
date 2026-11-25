#!/usr/bin/env python3
# gerar_planilha_especies.py
#
# Gera/atualiza a planilha-resumo de TODAS as espécies já processadas pelo
# pipeline (etapa 01→02), varrendo `07 Executado por espécie/<Especie>/`.
#
# É IDEMPOTENTE e REUTILIZÁVEL: rode este script sempre que novas espécies forem
# baixadas — ele re-varre todas as pastas e reescreve o Excel em ORDEM ALFABÉTICA,
# inserindo automaticamente as novidades.
#
#   python 05_utils/gerar_planilha_especies.py
#
# Saída: `07 Executado por espécie/Resumo_Especies.xlsx` (abas Resumo, Baixados por
# fonte, Limpeza por etapa, Notas).
#
# Fontes de cada coluna:
#   - `<Esp>_occurrences_report.json` → baixados/merge/dedup/limpo, por-fonte,
#     dedup por critério, limpeza por etapa, requisições (attempts) e tempo
#     (duration_s) por fonte, carimbo de data.
#   - `sp_<Esp>_occurrences.csv`       → presenças (sp=1) e pseudoausências (sp=0).
#   - `RELATORIO_<Esp>.md`             → nº de ecorregiões e menor distância (raio).
#
# NOTA sobre "tokens": o pipeline de aquisição/limpeza/pseudoausência NÃO consome
# tokens de LLM (é coleta de dados). A coluna existe por pedido, marcada como N/A;
# o custo real mensurável é "Requisições HTTP" e "Tempo de download".

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "07 Executado por espécie"
OUT_XLSX = BASE / "Resumo_Especies.xlsx"

# Ordem preferida das fontes (as demais entram ao final, em ordem alfabética).
PROVIDER_ORDER = [
    "gbif", "inaturalist", "sibbr", "specieslink", "idigbio", "bold", "obis",
    "vertnet", "bien", "ebird", "atlas", "emodnet",
]
# Ordem das etapas de limpeza (como no orquestrador do cleaner) + dedup.
CLEAN_STEPS = [
    "missing_coordinates", "invalid_coordinates", "zero_coordinates",
    "equal_coordinates", "gbif_issues", "basis_of_record",
    "occurrence_status_absent", "coordinate_uncertainty", "invalid_dates",
    "duplicates", "spatial_thinning", "centroids", "institutions", "capitals",
    "sea_or_land",
]
DEDUP_STEPS = ["occurrenceID", "catalog_institution", "coords_date_species"]


def _parse_relatorio(path: Path) -> tuple[int | None, float | None]:
    """Extrai (nº de ecorregiões, menor distância km) do RELATORIO markdown."""
    if not path.exists():
        return None, None
    txt = path.read_text(encoding="utf-8", errors="replace")
    eco = re.search(r"\*\*(\d+)\s*ecorregi", txt) or re.search(r"(\d+)\s*ecorregi", txt)
    dist = re.search(r"menor dist[^\n]*?([\d]+[.,]?[\d]*)\s*km", txt, re.I)
    eco_n = int(eco.group(1)) if eco else None
    dist_v = float(dist.group(1).replace(",", ".")) if dist else None
    return eco_n, dist_v


def _sp_counts(sp_csv: Path) -> tuple[int | None, int | None]:
    """Conta presenças (sp=1) e ausências (sp=0) no dataset final."""
    if not sp_csv.exists():
        return None, None
    df = pd.read_csv(sp_csv, usecols=["sp"])
    pres = int((df["sp"] == 1).sum())
    absc = int((df["sp"] == 0).sum())
    return pres, absc


def coletar() -> dict:
    """Varre a pasta 07 e retorna listas de linhas para cada aba."""
    resumo, por_fonte, por_limpeza = [], [], []
    for folder in sorted(BASE.iterdir(), key=lambda p: p.name.lower()):
        if not folder.is_dir():
            continue
        # Localiza o report por glob (robusto a pastas renomeadas manualmente,
        # ex.: "Leontopithecus_rosalia - poucos dados"): os arquivos internos
        # mantêm o prefixo original do slug.
        reports = list(folder.glob("*_occurrences_report.json"))
        if not reports:
            continue  # pasta sem execução completa do pipeline (ex.: dado manual)
        report = reports[0]
        rep = json.loads(report.read_text(encoding="utf-8"))
        # Nome científico a partir do próprio relatório (não do nome da pasta).
        especie = rep.get("species") or report.name.replace(
            "_occurrences_report.json", "").replace("_", " ")

        provs = rep.get("providers", [])
        prov_down = {p["provider"]: p.get("downloaded", 0) for p in provs}
        contribuintes = sum(1 for p in provs if p.get("kept", 0) > 0)
        req_http = sum(int(p.get("attempts", 0)) for p in provs)
        dur_max = max((float(p.get("duration_s", 0.0)) for p in provs), default=0.0)
        dur_sum = sum(float(p.get("duration_s", 0.0)) for p in provs)

        cr = rep.get("cleaning_report") or {}
        removed = cr.get("removed") or {}
        dd = rep.get("dedup_report") or {}
        dd_removed = dd.get("removed_by") or {}
        timestamp = (cr.get("timestamp") or "")[:10]

        sp_csv = next(iter(folder.glob("sp_*_occurrences.csv")), None)
        pres, absc = _sp_counts(sp_csv) if sp_csv else (None, None)
        if pres is None:
            pres = rep.get("total_after_clean")
        relatorio = next(iter(folder.glob("RELATORIO_*.md")), None)
        eco_n, dist_v = _parse_relatorio(relatorio) if relatorio else (None, None)

        resumo.append({
            "Espécie": especie,
            "Baixados (bruto)": rep.get("total_downloaded"),
            "Após união": rep.get("total_after_merge"),
            "Após dedup": rep.get("total_after_dedup"),
            "Removidos na dedup": dd.get("total_removed"),
            "Presenças (limpo)": rep.get("total_after_clean"),
            "Removidos na limpeza": cr.get("total_removed"),
            "Pseudoausências": absc,
            "Total dataset (sp)": (pres + absc) if (pres is not None and absc is not None) else None,
            "Ecorregiões ocupadas": eco_n,
            "Fontes contribuintes": contribuintes,
            "Requisições HTTP": req_http,
            "Tempo download (s, ~paralelo)": round(dur_max, 1),
            "Tempo download (s, soma CPU)": round(dur_sum, 1),
            "Menor distância (km)": dist_v,
            "Data execução": timestamp,
            "Tokens LLM": "N/A (pipeline sem LLM)",
        })

        row_f = {"Espécie": especie, "Total baixado": rep.get("total_downloaded")}
        for prov, d in prov_down.items():
            row_f[prov] = d
        por_fonte.append(row_f)

        row_c = {"Espécie": especie}
        for step in CLEAN_STEPS:
            row_c[f"limp:{step}"] = removed.get(step, 0)
        for step in DEDUP_STEPS:
            row_c[f"dedup:{step}"] = dd_removed.get(step, 0)
        row_c["Total removido (dedup+limpeza)"] = (
            (dd.get("total_removed") or 0) + (cr.get("total_removed") or 0)
        )
        por_limpeza.append(row_c)

    return {"resumo": resumo, "por_fonte": por_fonte, "por_limpeza": por_limpeza}


def _ordena_colunas_fonte(df: pd.DataFrame) -> pd.DataFrame:
    fixed = ["Espécie", "Total baixado"]
    provs = [c for c in df.columns if c not in fixed]
    ordered = [p for p in PROVIDER_ORDER if p in provs]
    ordered += sorted(p for p in provs if p not in ordered)
    return df[fixed + ordered]


def gerar() -> Path:
    dados = coletar()
    if not dados["resumo"]:
        raise SystemExit(f"Nenhuma espécie com report.json encontrada em {BASE}")

    df_resumo = pd.DataFrame(dados["resumo"]).sort_values("Espécie").reset_index(drop=True)
    df_fonte = _ordena_colunas_fonte(
        pd.DataFrame(dados["por_fonte"]).fillna(0)
    ).sort_values("Espécie").reset_index(drop=True)
    df_limp = pd.DataFrame(dados["por_limpeza"]).fillna(0).sort_values("Espécie").reset_index(drop=True)

    notas = pd.DataFrame({
        "Campo": [
            "Baixados (bruto)", "Após união/dedup", "Presenças (limpo)",
            "Pseudoausências", "Ecorregiões ocupadas", "Requisições HTTP",
            "Tempo download (s, ~paralelo)", "Tempo download (s, soma CPU)",
            "Menor distância (km)", "Tokens LLM",
            "Aba 'Baixados por fonte'", "Aba 'Limpeza por etapa'", "Atualização",
        ],
        "Descrição": [
            "Total de registros baixados de todas as fontes (antes de qualquer limpeza).",
            "Registros após unir as fontes / após deduplicação multi-fonte.",
            "Registros de presença após a limpeza completa (dado limpo).",
            "Nº de pseudoausências geradas (dataset final sp=0).",
            "Nº de ecorregiões RESOLVE 2017 que definiram a Área M.",
            "Soma das requisições HTTP a todas as fontes (proxy de 'chamadas').",
            "Tempo de download: aprox. wall-clock (fontes em paralelo) = maior duração.",
            "Tempo de download somando o tempo de cada fonte (CPU acumulado).",
            "Menor distância entre pseudoausência e presença (deve ser ≥ raio, 10 km).",
            "O pipeline de download/limpeza/pseudoausência NÃO consome tokens de LLM.",
            "Registros baixados por cada fonte (antes da limpeza).",
            "Quantos registros cada filtro de limpeza (e a dedup) removeu.",
            "Regenerada por 05_utils/gerar_planilha_especies.py (ordem alfabética).",
        ],
    })

    with pd.ExcelWriter(OUT_XLSX, engine="openpyxl") as xw:
        df_resumo.to_excel(xw, sheet_name="Resumo", index=False)
        df_fonte.to_excel(xw, sheet_name="Baixados por fonte", index=False)
        df_limp.to_excel(xw, sheet_name="Limpeza por etapa", index=False)
        notas.to_excel(xw, sheet_name="Notas", index=False)
        _formatar(xw)

    print(f"Planilha gerada: {OUT_XLSX} | {len(df_resumo)} espécies")
    return OUT_XLSX


def _formatar(xw) -> None:
    """Cabeçalho em negrito, painel congelado, autofiltro e largura de colunas."""
    from openpyxl.styles import Font, PatternFill, Alignment
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="1F6F3D")
    for ws in xw.book.worksheets:
        ws.freeze_panes = "B2"
        ws.auto_filter.ref = ws.dimensions
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(vertical="center", wrap_text=True)
        for col in ws.columns:
            width = max((len(str(c.value)) for c in col if c.value is not None), default=10)
            ws.column_dimensions[col[0].column_letter].width = min(max(width + 2, 10), 42)


if __name__ == "__main__":
    gerar()
