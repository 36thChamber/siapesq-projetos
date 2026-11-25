# test_deduplicator.py — regressão do viés SISBio no dedup (correção 16/08/2026).
#
# Roda sozinho (da raiz):  .venv\Scripts\python.exe 01_data_acquisition\occurrences\test_deduplicator.py
# Também funciona com pytest, se um dia houver.
#
# Cobre os 3 comportamentos que NÃO podem regredir:
#   A) programa SISBio (HUMAN_OBSERVATION, mesmo catálogo, coordenadas distintas)
#      -> TODOS os pontos preservados;
#   B) espécime de museu repetido entre GBIF e SpeciesLink (mesmo catálogo,
#      georreferenciamento levemente diferente) -> colapsa em 1;
#   C) chave forte com muitas coordenadas distintas (campanha disfarçada de espécime)
#      -> grupo preservado e reportado em `campanhas_preservadas`.

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from deduplicator import deduplicate  # noqa: E402


def _linha(cat, inst, basis, lat, lon, y=2020, m=1, d=15, oid=None, prov="sibbr"):
    return dict(occurrenceID=oid, catalogNumber=cat, institutionCode=inst,
                basisOfRecord=basis, decimalLatitude=lat, decimalLongitude=lon,
                year=y, month=m, day=d, species="Alouatta guariba",
                source=prov, provider=prov)


def caso_A_programa_sisbio():
    # 10 observações da mesma licença, em 10 fragmentos diferentes.
    linhas = [_linha("SISBIO-5685", "ICMBio", "HUMAN_OBSERVATION",
                     -30.0 - i * 0.05, -51.0 - i * 0.05, d=10 + i) for i in range(10)]
    # + 1 duplicata REAL (mesma licença, mesmo lugar, mesmo dia, veio de 2 fontes)
    linhas.append(_linha("SISBIO-5685", "ICMBio", "HUMAN_OBSERVATION",
                         -30.0, -51.0, d=10, prov="gbif"))
    out, rep = deduplicate(pd.DataFrame(linhas), level="medium")
    assert len(out) == 10, f"caso A: esperava 10 preservados, veio {len(out)}"
    assert rep["removed_by"]["catalog_institution_obs"] == 1, rep["removed_by"]
    assert rep["removed_by"]["catalog_institution"] == 0, rep["removed_by"]
    print("[OK] A: programa SISBio preservado (10 pontos), duplicata real removida (1)")


def caso_B_especime_duplicado():
    # Mesmo espécime no GBIF e no SpeciesLink, georreferenciado com ~200 m de diferença.
    linhas = [
        _linha("MCN-2206", "PUC-RS", "PRESERVED_SPECIMEN", -30.201, -51.012, prov="gbif"),
        _linha("MCN-2206", "PUC-RS", "PRESERVED_SPECIMEN", -30.203, -51.010, prov="specieslink"),
    ]
    out, rep = deduplicate(pd.DataFrame(linhas), level="medium")
    assert len(out) == 1, f"caso B: esperava 1, veio {len(out)}"
    assert rep["removed_by"]["catalog_institution"] == 1, rep["removed_by"]
    assert "gbif" in str(out.iloc[0]["source"]) and "specieslink" in str(out.iloc[0]["source"])
    print("[OK] B: espécime GBIF+SpeciesLink colapsado em 1 (fontes agregadas)")


def caso_C_campanha_disfarcada():
    # "Espécime" com o mesmo catálogo em 8 lugares — campanha; não pode colapsar.
    linhas = [_linha("COL-1", "MuseuX", "PRESERVED_SPECIMEN",
                     -29.0 - i * 0.1, -52.0, d=1 + i) for i in range(8)]
    out, rep = deduplicate(pd.DataFrame(linhas), level="medium")
    assert len(out) == 8, f"caso C: esperava 8 preservados, veio {len(out)}"
    trava = rep.get("campanhas_preservadas", {}).get("catalog_institution", [])
    assert trava and trava[0][1] == 8, f"caso C: trava não reportou: {trava}"
    print("[OK] C: campanha disfarçada preservada (8 pontos) e reportada")


def caso_D_top_keys():
    # O relatório expõe a chave que mais removeu.
    linhas = [_linha("MCN-9", "MuseuX", "PRESERVED_SPECIMEN", -29.5, -52.5, prov=p)
              for p in ("gbif", "specieslink", "sibbr")]
    out, rep = deduplicate(pd.DataFrame(linhas), level="medium")
    assert len(out) == 1
    top = rep["top_keys"]["catalog_institution"]
    assert top[0][1] == 2, top
    print("[OK] D: top_keys expõe a chave com remoção em massa")


if __name__ == "__main__":
    caso_A_programa_sisbio()
    caso_B_especime_duplicado()
    caso_C_campanha_disfarcada()
    caso_D_top_keys()
    print("\nTodos os casos passaram.")
