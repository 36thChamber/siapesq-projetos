#!/usr/bin/env python3
# run_pipeline_oceanico.py — Orquestrador do PIPELINE OCEÂNICO (espécies marinhas).
#
# Um comando, ponta a ponta, para UMA espécie marinha:
#   1) occ       Ocorrências marinhas (7 fontes, config_marinho.yaml) + limpeza
#   2) clean     Terra/mar por BATIMETRIA (remove terra) + faixa de profundidade
#   3) pseudo    Pseudo-ausências ALEATÓRIAS no oceano (faixa de profundidade, raio 25 km, 1:1)
#   4) captura   Captura DIÁRIA (sst/sss/chl/profundidade) no dia da ocorrência (CMEMS)
#   5) qc        QC ambiental com GATE (APTO/REVISAR/NAO_APTO; piso 100 presenças)
#   6) modelagem Random Forest (Python/sklearn) — treino + avaliação
#   7) predicao  Predição-teste sobre a MÉDIA ANUAL DE 10 ANOS (mapa de adequabilidade)
#
# Domínio: Atlântico Sul (lon -70/20, lat -60/15), anos 2003-2026. Se após a limpeza
# houver < 100 presenças, a busca é REFEITA em cobertura GLOBAL (fallback de dados).
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe run_pipeline_oceanico.py --especie "Pomatomus saltatrix" --seed 42

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
ACQ_DIR = ROOT / "01_data_acquisition"
CONFIG_MAR = ACQ_DIR / "occurrences" / "config_marinho.yaml"
PSEUDO = ROOT / "02_pseudoabsence" / "gen_pseudo_occurences.py"
CAPTURA = ROOT / "03_environmental_processing" / "captura_marinha.py"
QC = ROOT / "03_environmental_processing" / "qc_marinho.py"
MODELO = ROOT / "04_modeling" / "modelo_marinho.py"
PREDIZER = ROOT / "04_modeling" / "predizer_marinho.py"
BASE07 = ROOT / "07 Executado por espécie"

sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "05_utils"))
import naming  # noqa: E402
import batimetria  # noqa: E402

STAGES = ("occ", "clean", "pseudo", "captura", "qc", "modelagem", "predicao")

# Domínio de estudo: (min_lon, min_lat, max_lon, max_lat)
DOMINIO_ATLANTICO = (-70.0, -60.0, 20.0, 15.0)
DOMINIO_GLOBAL = (-180.0, -90.0, 180.0, 90.0)
ANOS = (2003, 2026)
PISO_EXPANSAO = 100         # < N presenças no Atlântico -> refaz busca GLOBAL
RADIUS_KM = 25.0
RATIO = 1.0
JANELA_PREDICAO = "2015-2024"   # média anual de 10 anos (predição-teste)
BATIMETRIA_PATH = str(batimetria.BATIMETRIA_PADRAO)   # troque p/ GEBCO quando disponível


def _banner(t: str) -> None:
    print(f"\n{'=' * 78}\n>> {t}\n{'=' * 78}", flush=True)


def _slug(especie: str) -> str:
    return naming.slug_especie(especie)


def _run(cmd: list[str], cwd: Path, dry_run: bool) -> int:
    mostrar = " ".join(f'"{c}"' if " " in c else c for c in cmd[1:])
    launcher = "python" if cmd[0] == sys.executable else Path(cmd[0]).stem
    print(f"$ (cd {cwd}) {launcher} {mostrar}", flush=True)
    if dry_run:
        print("  [dry-run] etapa NÃO executada.", flush=True)
        return 0
    return subprocess.run(cmd, cwd=str(cwd)).returncode


def _n_presencas(occ_csv: Path) -> int:
    if not occ_csv or not occ_csv.exists():
        return 0
    try:
        return len(pd.read_csv(occ_csv))
    except Exception:  # noqa: BLE001
        return 0


# ---------------------------------------------------------------------------
def etapa_ocorrencias(args, dest: Path, dominio, dry_run: bool) -> Path | None:
    lon0, lat0, lon1, lat1 = dominio
    cmd = [sys.executable, "-m", "occurrences",
           "--config", str(CONFIG_MAR),
           "--species", args.especie,
           "--output-dir", str(dest),
           "--min-lon", str(lon0), "--max-lon", str(lon1),
           "--min-lat", str(lat0), "--max-lat", str(lat1),
           "--min-year", str(ANOS[0]), "--max-year", str(ANOS[1])]
    if args.no_cache:
        cmd += ["--no-cache"]
    if not dry_run:
        dest.mkdir(parents=True, exist_ok=True)
    rc = _run(cmd, cwd=ACQ_DIR, dry_run=dry_run)
    if rc != 0 and not dry_run:
        raise SystemExit(f"[ERRO] etapa occ falhou (código {rc}).")
    if dry_run:
        return dest / naming.nome("occurrence", args.especie, dest, "csv")
    return naming.achar("occurrence", dest)


def etapa_clean(args, occ_csv: Path, dry_run: bool) -> tuple[Path, float | None, float | None]:
    """Terra/mar por batimetria: mantém só ocorrências no oceano; mede a faixa de
    profundidade (para o sorteio de pseudo). Grava Occurrence marinho recortado."""
    _banner("ETAPA 2 — Limpeza marinha (terra/mar por batimetria + faixa de profundidade)")
    if dry_run or occ_csv is None:
        print("  [dry-run] removeria pontos em terra e mediria a faixa de profundidade.", flush=True)
        return (occ_csv, None, None)
    df = pd.read_csv(occ_csv)
    lat_c = "decimalLatitude" if "decimalLatitude" in df.columns else "lat"
    lon_c = "decimalLongitude" if "decimalLongitude" in df.columns else "lon"
    n0 = len(df)
    mask = batimetria.eh_oceano(df[lat_c], df[lon_c], BATIMETRIA_PATH)
    df = df.loc[mask].reset_index(drop=True)
    print(f"[clean] terra/mar: {n0} -> {len(df)} ocorrências no oceano (removidas {n0 - len(df)}).", flush=True)
    faixa = batimetria.faixa_profundidade(df[lat_c], df[lon_c], BATIMETRIA_PATH)
    dmin, dmax = (faixa if faixa else (None, None))
    print(f"[clean] faixa de profundidade das ocorrências: {faixa} m", flush=True)
    # grava recortado (mesmo nome, sobrescreve — é o insumo da pseudo)
    df.to_csv(occ_csv, index=False)
    return (occ_csv, dmin, dmax)


def etapa_pseudo(args, occ_csv: Path, dominio, dmin, dmax, dry_run: bool) -> Path:
    _banner("ETAPA 3 — Pseudo-ausências (aleatórias no oceano; faixa de profundidade)")
    lon0, lat0, lon1, lat1 = dominio
    cmd = [sys.executable, str(PSEUDO),
           "--csv", str(occ_csv), "--species_name", args.especie,
           "--seed", str(args.seed), "--ocean_only",
           "--bathymetry_input", BATIMETRIA_PATH,
           "--bbox", str(lon0), str(lat0), str(lon1), str(lat1),
           "--radius_km", str(RADIUS_KM), "--ratio", str(RATIO)]
    if dmin is not None and dmax is not None:
        cmd += ["--depth_min", str(dmin), "--depth_max", str(dmax)]
    rc = _run(cmd, cwd=ROOT, dry_run=dry_run)
    if rc != 0 and not dry_run:
        raise SystemExit(f"[ERRO] etapa pseudo falhou (código {rc}).")
    dest = occ_csv.parent
    return dest / naming.nome("pseudoabsence", args.especie, dest, "csv")


def etapa_captura(args, pseudo_csv: Path, dry_run: bool) -> Path | None:
    _banner("ETAPA 4 — Captura ambiental DIÁRIA (sst/sss/chl/profundidade — CMEMS)")
    cmd = [sys.executable, str(CAPTURA), "--csv", str(pseudo_csv),
           "--batimetria", BATIMETRIA_PATH, "--max_workers", str(args.max_workers)]
    rc = _run(cmd, cwd=ROOT, dry_run=dry_run)
    if rc != 0 and not dry_run:
        raise SystemExit(f"[ERRO] etapa captura falhou (código {rc}).")
    if dry_run:
        vd = pseudo_csv.parent / f"{_slug(args.especie)}_variables_marinho_{naming.carimbo(pseudo_csv.parent)}"
        return vd / naming.nome("variables", args.especie, pseudo_csv.parent, "csv")
    return naming.achar("variables", pseudo_csv.parent, recursivo=True)


def etapa_qc(args, variables_csv: Path, dry_run: bool) -> str:
    _banner("ETAPA 5 — QC ambiental com GATE (APTO/REVISAR/NAO_APTO)")
    cmd = [sys.executable, str(QC), "--csv", str(variables_csv)]
    rc = _run(cmd, cwd=ROOT, dry_run=dry_run)
    if dry_run:
        return "APTO"
    # rc: 0 = APTO/REVISAR (segue), 3 = NAO_APTO (bloqueia)
    return "APTO" if rc == 0 else "NAO_APTO"


def etapa_modelagem(args, variables_csv: Path, dry_run: bool) -> Path | None:
    _banner("ETAPA 6 — Modelagem Random Forest (Python/sklearn)")
    model_dir = variables_csv.parent.parent / "modelo_rf_marinho"
    cmd = [sys.executable, str(MODELO), "--csv", str(variables_csv),
           "--outdir", str(model_dir), "--especie", args.especie, "--seed", str(args.seed)]
    rc = _run(cmd, cwd=ROOT, dry_run=dry_run)
    if rc != 0 and not dry_run:
        raise SystemExit(f"[ERRO] etapa modelagem falhou (código {rc}).")
    return model_dir / f"rf_{_slug(args.especie)}_marinho.joblib"


def etapa_predicao(args, model_path: Path, dominio, dmin, dmax, dry_run: bool) -> None:
    _banner("ETAPA 7 — Predição-teste (média anual de 10 anos) — mapa de adequabilidade")
    lon0, lat0, lon1, lat1 = dominio
    out_dir = model_path.parent
    cmd = [sys.executable, str(PREDIZER),
           "--model", str(model_path),
           "--bbox", str(lon0), str(lat0), str(lon1), str(lat1),
           "--janela", JANELA_PREDICAO,
           "--batimetria", BATIMETRIA_PATH,
           "--outdir", str(out_dir), "--especie", args.especie]
    if dmin is not None and dmax is not None:
        cmd += ["--depth_min", str(dmin), "--depth_max", str(dmax)]
    rc = _run(cmd, cwd=ROOT, dry_run=dry_run)
    if rc != 0 and not dry_run:
        raise SystemExit(f"[ERRO] etapa predição falhou (código {rc}).")


# ---------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(description="Pipeline OCEÂNICO (marinho) — occ→...→predição.")
    p.add_argument("--especie", required=True)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--start", choices=STAGES, default="occ")
    p.add_argument("--stop", choices=STAGES, default="predicao")
    p.add_argument("--no-cache", dest="no_cache", action="store_true")
    p.add_argument("--max_workers", type=int, default=5)
    p.add_argument("--force", action="store_true", help="Ignora o gate NAO_APTO do QC e segue.")
    p.add_argument("--dry_run", action="store_true")
    args = p.parse_args()

    i0, i1 = STAGES.index(args.start), STAGES.index(args.stop)
    if i0 > i1:
        raise SystemExit(f"[ERRO] --start ({args.start}) vem depois de --stop ({args.stop}).")

    slug = _slug(args.especie)
    dest = BASE07 / slug

    _banner(f"PIPELINE OCEÂNICO — {args.especie}")
    print(f"Pasta          : {dest}", flush=True)
    print(f"Etapas         : {' -> '.join(STAGES[i0:i1 + 1])}", flush=True)
    print(f"Domínio        : Atlântico {DOMINIO_ATLANTICO} (global se < {PISO_EXPANSAO} presenças)", flush=True)
    print(f"Anos           : {ANOS} | seed {args.seed} | batimetria {Path(BATIMETRIA_PATH).name}", flush=True)
    print(f"Execução       : {'DRY-RUN' if args.dry_run else 'EXECUÇÃO'}", flush=True)

    dominio = DOMINIO_ATLANTICO
    occ_csv = dmin = dmax = pseudo_csv = variables_csv = model_path = None

    # 1) OCORRÊNCIAS (com expansão Atlântico -> global)
    if i0 <= STAGES.index("occ") <= i1:
        _banner("ETAPA 1 — Ocorrências marinhas (Atlântico) + limpeza")
        occ_csv = etapa_ocorrencias(args, dest, DOMINIO_ATLANTICO, args.dry_run)
        n = _n_presencas(occ_csv)
        print(f"[occ] presenças (Atlântico, pós-limpeza): {n}", flush=True)
        if not args.dry_run and n < PISO_EXPANSAO:
            _banner(f"ETAPA 1b — Poucas presenças ({n} < {PISO_EXPANSAO}) — refazendo busca GLOBAL")
            occ_csv = etapa_ocorrencias(args, dest, DOMINIO_GLOBAL, args.dry_run)
            n = _n_presencas(occ_csv)
            print(f"[occ] presenças (global, pós-limpeza): {n}", flush=True)
            dominio = DOMINIO_GLOBAL
    else:
        occ_csv = naming.achar("occurrence", dest)

    # 2) LIMPEZA MARINHA (terra/mar por batimetria + faixa de profundidade)
    if i0 <= STAGES.index("clean") <= i1:
        occ_csv, dmin, dmax = etapa_clean(args, occ_csv, args.dry_run)
    elif occ_csv is not None and not args.dry_run:
        df = pd.read_csv(occ_csv)
        lat_c = "decimalLatitude" if "decimalLatitude" in df.columns else "lat"
        lon_c = "decimalLongitude" if "decimalLongitude" in df.columns else "lon"
        faixa = batimetria.faixa_profundidade(df[lat_c], df[lon_c], BATIMETRIA_PATH)
        dmin, dmax = (faixa if faixa else (None, None))

    # 3) PSEUDO-AUSÊNCIAS
    if i0 <= STAGES.index("pseudo") <= i1:
        pseudo_csv = etapa_pseudo(args, occ_csv, dominio, dmin, dmax, args.dry_run)
    else:
        pseudo_csv = naming.achar("pseudoabsence", dest)

    # 4) CAPTURA
    if i0 <= STAGES.index("captura") <= i1:
        variables_csv = etapa_captura(args, pseudo_csv, args.dry_run)
    else:
        variables_csv = naming.achar("variables", dest, recursivo=True)

    # 5) QC GATE
    if i0 <= STAGES.index("qc") <= i1:
        veredito = etapa_qc(args, variables_csv, args.dry_run)
        if veredito == "NAO_APTO" and not args.force:
            raise SystemExit("[GATE] QC = NAO_APTO — pipeline interrompido antes da modelagem. "
                             "Use --force para prosseguir mesmo assim.")

    # 6) MODELAGEM
    if i0 <= STAGES.index("modelagem") <= i1:
        model_path = etapa_modelagem(args, variables_csv, args.dry_run)
    else:
        model_path = (variables_csv.parent.parent / "modelo_rf_marinho" /
                      f"rf_{slug}_marinho.joblib") if variables_csv else None

    # 7) PREDIÇÃO
    if i0 <= STAGES.index("predicao") <= i1:
        etapa_predicao(args, model_path, dominio, dmin, dmax, args.dry_run)

    _banner("PIPELINE OCEÂNICO CONCLUÍDO")
    print(f"Resultados em: {dest}", flush=True)


if __name__ == "__main__":
    main()