#!/usr/bin/env python3
# run_pipeline_ocean.py - Orquestrador LINEAR do pipeline SDM OCEÂNICO (um comando, ponta a ponta).
#
# Irmão marinho do run_pipeline.py (continental). Encadeia as etapas da rotina
# oceânica para UMA espécie, cuidando do "handoff" de arquivos entre elas:
#
#   1) occ       Ocorrências multi-fonte (config_marinho.yaml: GBIF/OBIS/EMODnet/...)
#                 -> Occurrence_<Especie>_<DD_MM_AA>.csv
#   2) pseudo    Remoção de TERRA por batimetria + faixa de profundidade das presenças
#                 + pseudo-ausências SÓ NO OCEANO (gen_pseudo --ocean_only)
#                 -> Pseudoabsence_<Especie>_<DD_MM_AA>.csv (+ Map_*.png)
#   3) captura   Variáveis marinhas DIÁRIAS no dia da ocorrência (CMEMS):
#                 sst, sss, chl (+ chl_log10) + profundidade (batimetria)
#                 -> <Especie>_variables_marinho_<data>/Variables_*.csv
#   4) qc        QC marinho com GATE (qc_marinho): APTO/REVISAR seguem; NAO_APTO PARA.
#                 -> QCVeredito_*.json/.txt
#   5) modelo    Random Forest — Python (sklearn) e/ou R (randomForest), via --engine.
#                 O R treina no MESMO split do Python (comparação justa).
#                 -> modelo_rf_marinho/rf_<slug>_marinho.joblib / _R.rds + _eval.json
#   6) predicao  Predição-TESTE anual (média 2015-2024, CMEMS mensal) -> mapa .tif/.png.
#                 O R prediz sobre as MESMAS células do mapa Python (gridX.csv).
#                 Com --engine ambos, roda comparar_py_r.py ao final (tabela + figura).
#
# --engine {python,r,ambos}  (padrão: ambos)
#   python -> só sklearn;  r -> só randomForest;  ambos -> os dois + comparação.
#   NOTA: o caminho R depende de 2 artefatos gerados pelo Python (o split de treino
#   e a grade de predição) — se faltarem, o orquestrador roda o passo Python
#   correspondente automaticamente, avisando (isso é DESENHO: mesmo split/mesma
#   grade é o que torna a comparação Python×R justa).
#
# Tudo é gravado em:  07 Executado por espécie/<Genero_especie>/
#
# EXECUTE SEMPRE DA RAIZ DO PROJETO (convenção do projeto):
#
#   .venv\Scripts\python.exe run_pipeline_ocean.py --especie "Pomatomus saltatrix" --seed 42
#   .venv\Scripts\python.exe run_pipeline_ocean.py --engine python --dry_run
#   .venv\Scripts\python.exe run_pipeline_ocean.py --engine r --start modelo
#
# Veja o plano SEM executar nada (valida a fiação/caminhos, custo zero):
#
#   .venv\Scripts\python.exe run_pipeline_ocean.py --dry_run

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import naming  # convenção de nomes das saídas (Tipo_Genero_especie_DD_MM_AA)

ROOT = Path(__file__).resolve().parent
ACQ_DIR = ROOT / "01_data_acquisition"
CONFIG_MARINHO = ACQ_DIR / "occurrences" / "config_marinho.yaml"
PSEUDO_SCRIPT = ROOT / "02_pseudoabsence" / "gen_pseudo_occurences.py"
CAPTURA_MARINHA = ROOT / "03_environmental_processing" / "captura_marinha.py"
QC_MARINHO = ROOT / "03_environmental_processing" / "qc_marinho.py"
MODELO_PY = ROOT / "04_modeling" / "modelo_marinho.py"
MODELO_R = ROOT / "04_modeling" / "modelo_marinho.R"
PREDIZER_PY = ROOT / "04_modeling" / "predizer_marinho.py"
PREDIZER_R = ROOT / "04_modeling" / "predizer_marinho.R"
COMPARAR = ROOT / "04_modeling" / "comparar_py_r.py"
BASE07 = ROOT / "07 Executado por espécie"

# Domínio de estudo padrão: ATLÂNTICO SUL (mesmo default do config_marinho.yaml).
# Ordem: (W, S, E, N). Sobrescrevível via --bbox.
BBOX_ATLANTICO_SUL = (-70.0, -60.0, 20.0, 15.0)
ANO_MIN_MAR, ANO_MAX_MAR = 2003, 2026  # era MODIS-Aqua (consistência de clorofila)
PISO_PRESENCAS = 100                   # aviso pós-etapa 1 (o gate duro é do qc_marinho)

STAGES = ("occ", "pseudo", "captura", "qc", "modelo", "predicao")


# ---------------------------------------------------------------------------
# Utilitários (mesma semântica do run_pipeline.py continental)
# ---------------------------------------------------------------------------
def _slug(especie: str) -> str:
    return naming.slug_especie(especie)


def _banner(titulo: str) -> None:
    linha = "=" * 78
    print(f"\n{linha}\n>> {titulo}\n{linha}", flush=True)


def _resolve_dest(slug: str, resuming: bool) -> Path:
    """Pasta da espécie em 07/. Em resume, reaproveita `07/<slug>*` se a exata não existir."""
    exact = BASE07 / slug
    if resuming and not exact.exists():
        matches = sorted(d for d in BASE07.glob(f"{slug}*") if d.is_dir())
        if matches:
            return matches[0]
    return exact


def _run(cmd: list[str], cwd: Path, dry_run: bool, ok_codes: tuple[int, ...] = (0,)) -> int:
    """Executa uma etapa (stdout/stderr herdados). `ok_codes` permite tratar códigos
    especiais (ex.: o gate do QC devolve 3 = NAO_APTO) sem estourar aqui."""
    launcher = "python" if cmd[0] == sys.executable else Path(cmd[0]).stem
    mostrar = " ".join(f'"{c}"' if " " in c else c for c in cmd[1:])
    print(f"$ (cd {cwd}) {launcher} {mostrar}", flush=True)
    if dry_run:
        print("  [dry-run] etapa NÃO executada.", flush=True)
        return 0
    res = subprocess.run(cmd, cwd=str(cwd))
    if res.returncode not in ok_codes:
        raise SystemExit(f"\n[ERRO] etapa falhou (código {res.returncode}). Pipeline interrompido.")
    return res.returncode


def _resolve_rscript(explicito: str | None, dry_run: bool = False) -> str:
    """Localiza o Rscript (PATH ou C:\\Program Files\\R\\R-*\\bin\\Rscript.exe)."""
    import glob
    if explicito:
        return explicito
    achado = shutil.which("Rscript")
    if achado:
        return achado
    for padrao in (r"C:\Program Files\R\R-*\bin\Rscript.exe",
                   r"C:\Program Files (x86)\R\R-*\bin\Rscript.exe"):
        hits = sorted(glob.glob(padrao))
        if hits:
            return hits[-1]
    if dry_run:
        return "Rscript"  # no dry-run não falha: só mostra o plano
    raise SystemExit("[ERRO] Rscript não encontrado. Instale o R ou passe --rscript <caminho>.")


def _find_occ_csv(dest: Path) -> Path | None:
    return naming.achar("occurrence", dest)


def _find_sp_csv(dest: Path) -> Path | None:
    return naming.achar("pseudoabsence", dest)


def _find_variables_marinho(dest: Path) -> Path | None:
    """Variables_*.csv da captura MARINHA (fica numa subpasta '*_variables_marinho_*')."""
    cands = [c for c in dest.rglob("Variables_*.csv")
             if c.is_file() and "marinho" in c.parent.name.lower()]
    if not cands:
        return None
    return max(cands, key=lambda p: p.stat().st_mtime)


# ---------------------------------------------------------------------------
# Etapas
# ---------------------------------------------------------------------------
def etapa_ocorrencias(args, dest: Path) -> Path:
    """1) Aquisição multi-fonte MARINHA -> Occurrence_<Esp>_<DD_MM_AA>.csv na pasta."""
    _banner("ETAPA 1 — Ocorrências marinhas (config_marinho.yaml) + limpeza adaptada ao mar")

    if args.occ_csv:  # CSV injetado pelo usuário: pula o download
        origem = Path(args.occ_csv).resolve()
        if not origem.exists():
            raise SystemExit(f"[ERRO] --occ_csv não encontrado: {origem}")
        destino = dest / naming.nome("occurrence", args.especie, dest, "csv")
        print(f"Usando CSV informado: {origem}\n  -> {destino}", flush=True)
        if not args.dry_run:
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origem, destino)
        return destino

    w, s, e, n = args.bbox
    cmd = [sys.executable, "-m", "occurrences",
           "--species", args.especie,
           "--output-dir", str(dest),
           "--config", str(CONFIG_MARINHO),
           "--min-lon", str(w), "--max-lon", str(e),
           "--min-lat", str(s), "--max-lat", str(n),
           "--min-year", str(args.min_year), "--max-year", str(args.max_year)]
    if args.no_cache:
        cmd += ["--no-cache"]

    if not args.dry_run:
        dest.mkdir(parents=True, exist_ok=True)
    _run(cmd, cwd=ACQ_DIR, dry_run=args.dry_run)

    occ = _find_occ_csv(dest)
    if occ is None:
        if args.dry_run:
            return dest / naming.nome("occurrence", args.especie, dest, "csv")
        raise SystemExit(f"[ERRO] etapa 1 não gerou Occurrence_*.csv em {dest}")

    # Aviso de piso (o gate DURO é o do QC, etapa 4): < 100 presenças raramente modela.
    if not args.dry_run:
        try:
            import pandas as pd
            n_occ = len(pd.read_csv(occ))
            if n_occ < PISO_PRESENCAS:
                print(f"[aviso] apenas {n_occ} presenças (< {PISO_PRESENCAS}). O QC (etapa 4) "
                      f"vai bloquear; considere ALARGAR o domínio (--bbox -180 -90 180 90).",
                      flush=True)
        except Exception:  # noqa: BLE001 — aviso best-effort, nunca derruba a etapa
            pass
    return occ


def _filtrar_terra_e_faixa(args, occ_csv: Path) -> tuple[float, float] | None:
    """2a) Remove por BATIMETRIA as presenças que caíram em TERRA (config_marinho.yaml
    deixa esse passo para o orquestrador) e mede a FAIXA DE PROFUNDIDADE das presenças
    oceânicas — usada para sortear pseudo-ausências na mesma faixa (--depth_min/max)."""
    if args.dry_run:
        print(f"  [dry-run] filtraria terra por batimetria ({args.batimetria}) e mediria a "
              f"faixa de profundidade das presenças (-> --depth_min/--depth_max).", flush=True)
        return None
    import pandas as pd
    sys.path.insert(0, str(ROOT / "05_utils"))
    import batimetria  # noqa: PLC0415

    df = pd.read_csv(occ_csv)
    dep = batimetria.profundidade_pontos(
        df["decimalLatitude"], df["decimalLongitude"], args.batimetria)
    import numpy as np
    oceano = np.isfinite(dep) & (dep < 0)
    n_terra = int((~oceano).sum())
    if n_terra:
        print(f"[batimetria] removendo {n_terra}/{len(df)} ponto(s) em TERRA (ou fora da "
              f"grade da batimetria); ficam {int(oceano.sum())} presenças oceânicas.", flush=True)
        df[oceano].to_csv(occ_csv, index=False)
    else:
        print(f"[batimetria] todas as {len(df)} presenças já são oceânicas.", flush=True)
    oce = dep[oceano]
    if oce.size == 0:
        raise SystemExit("[ERRO] nenhuma presença oceânica após o filtro de batimetria.")
    faixa = (float(oce.min()), float(oce.max()))
    print(f"[batimetria] faixa de profundidade das presenças: {faixa[0]:.1f} a "
          f"{faixa[1]:.1f} m (negativo = oceano).", flush=True)
    return faixa


def etapa_pseudo(args, dest: Path, occ_csv: Path) -> Path:
    """2) Filtro de terra + pseudo-ausências SÓ NO OCEANO, na faixa de profundidade
    das presenças -> Pseudoabsence_<Esp>_<DD_MM_AA>.csv."""
    _banner("ETAPA 2 — Batimetria (remove terra) + pseudo-ausências oceânicas")

    if occ_csv is None or (not occ_csv.exists() and not args.dry_run):
        raise SystemExit(f"[ERRO] etapa 2 exige o CSV de ocorrências (não encontrado em {dest}).")

    faixa = _filtrar_terra_e_faixa(args, occ_csv)
    depth_min = args.depth_min if args.depth_min is not None else (faixa[0] if faixa else None)
    depth_max = args.depth_max if args.depth_max is not None else (faixa[1] if faixa else None)

    w, s, e, n = args.bbox
    cmd = [sys.executable, str(PSEUDO_SCRIPT),
           "--csv", str(occ_csv),
           "--species_name", args.especie,
           "--seed", str(args.seed),
           "--radius_km", str(args.radius_km),
           "--ratio", str(args.ratio),
           "--ocean_only",
           "--bathymetry_input", str(args.batimetria),
           "--bbox", str(w), str(s), str(e), str(n)]
    if args.num_absences:
        cmd += ["--num_absences", str(args.num_absences)]
    if depth_min is not None:
        cmd += ["--depth_min", str(depth_min)]
    if depth_max is not None:
        cmd += ["--depth_max", str(depth_max)]
    if args.dry_run and faixa is None and args.depth_min is None:
        print("  [dry-run] (+ --depth_min/--depth_max calculados da faixa das presenças)",
              flush=True)

    _run(cmd, cwd=ROOT, dry_run=args.dry_run)

    destino = dest / naming.nome("pseudoabsence", args.especie, dest, "csv")
    if args.dry_run:
        print(f"  [dry-run] geraria {destino}", flush=True)
        return destino
    if not destino.exists():
        raise SystemExit(f"[ERRO] etapa 2 não gerou {destino}")
    print(f"Pseudo-ausências -> {destino}", flush=True)
    return destino


def etapa_captura(args, dest: Path, sp_csv: Path | None) -> Path | None:
    """3) Captura marinha DIÁRIA (CMEMS: sst/sss/chl + profundidade) -> Variables_*.csv."""
    _banner("ETAPA 3 — Captura de variáveis marinhas (diária: sst, sss, chl, profundidade)")

    if sp_csv is None and not args.dry_run:
        raise SystemExit(f"[ERRO] etapa 3 exige o Pseudoabsence_*.csv (não encontrado em {dest}).")

    cmd = [sys.executable, str(CAPTURA_MARINHA),
           "--data_dir", str(args.data_dir),
           "--batimetria", str(args.batimetria),
           "--max_workers", str(args.max_workers),
           "--retries", str(args.retries)]
    cmd += ["--csv", str(sp_csv)] if sp_csv is not None else ["--especie", args.especie]

    _run(cmd, cwd=ROOT, dry_run=args.dry_run)

    var_csv = _find_variables_marinho(dest)
    if var_csv is None and not args.dry_run:
        raise SystemExit(f"[ERRO] etapa 3 não gerou Variables_*.csv marinho em {dest}")
    if var_csv is None:
        print(f"  [dry-run] geraria {dest / ('<slug>_variables_marinho_<data>/Variables_*.csv')}",
              flush=True)
    return var_csv


def etapa_qc(args, dest: Path, var_csv: Path | None) -> None:
    """4) QC marinho com GATE: APTO/REVISAR seguem; NAO_APTO (código 3) PARA o pipeline."""
    _banner("ETAPA 4 — QC marinho com gate (APTO / REVISAR seguem; NAO_APTO bloqueia)")

    if var_csv is None and not args.dry_run:
        raise SystemExit(f"[ERRO] etapa 4 exige o Variables_*.csv marinho (não achado em {dest}).")

    cmd = [sys.executable, str(QC_MARINHO)]
    cmd += ["--csv", str(var_csv)] if var_csv is not None else ["--especie", args.especie]
    code = _run(cmd, cwd=ROOT, dry_run=args.dry_run, ok_codes=(0, 3))
    if code == 3:
        raise SystemExit(
            "\n[GATE] QC marinho: veredito NAO_APTO — o dataset não tem condições de modelar "
            "(veja QCVeredito_*.txt na pasta da espécie). Pipeline interrompido ANTES do treino.")


def etapa_modelo(args, dest: Path, var_csv: Path | None, rscript: str) -> Path:
    """5) Treino RF — Python (sklearn) e/ou R (randomForest), conforme --engine.
    O R treina no MESMO split do Python (arquivo *_dados_split.csv)."""
    _banner(f"ETAPA 5 — Modelagem Random Forest marinha (engine: {args.engine})")

    if var_csv is None and not args.dry_run:
        raise SystemExit(f"[ERRO] etapa 5 exige o Variables_*.csv marinho (não achado em {dest}).")

    sufixo_ano = f"_{args.ano_modelo}" if args.ano_modelo is not None else ""
    model_dir = dest / f"modelo_rf_marinho{sufixo_ano}"
    nome_py = f"rf_{_slug(args.especie)}_marinho"
    split_csv = model_dir / f"{nome_py}_dados_split.csv"
    if not args.dry_run:
        model_dir.mkdir(parents=True, exist_ok=True)

    precisa_py = args.engine in ("python", "ambos")
    split_compativel = split_csv.exists()
    if args.engine == 'r' and split_compativel:
        import json
        avaliacao = model_dir / f'{nome_py}_eval.json'
        try:
            dados = json.loads(avaliacao.read_text(encoding='utf-8'))
            split_compativel = (dados.get('balanceamento', {}).get('proporcao') == '1:1'
                                and dados.get('seed') == args.seed
                                and dados.get('ano_modelo') == args.ano_modelo)
        except (OSError, ValueError):
            split_compativel = False
    if args.engine == "r" and not split_compativel:
        print(f"[nota] engine=r: falta um split compartilhado com balanceamento 1:1 "
              f"e a mesma configuração ({split_csv.name}). O treino Python roda ANTES para gerar o split — "
              f"é ele que torna a comparação Python×R justa (mesmas linhas).", flush=True)
        precisa_py = True

    var_str = str(var_csv) if var_csv is not None else "<Variables_*.csv marinho>"
    if precisa_py:
        cmd = [sys.executable, str(MODELO_PY),
               "--csv", var_str, "--outdir", str(model_dir),
               "--especie", args.especie, "--seed", str(args.seed),
               "--n_estimators", str(args.n_estimators)]
        if args.ano_modelo is not None:
            cmd += ["--ano", str(args.ano_modelo)]
        _run(cmd, cwd=ROOT, dry_run=args.dry_run)

    if args.engine in ("r", "ambos"):
        cmd = [rscript, str(MODELO_R), str(split_csv), str(model_dir),
               args.especie, str(args.n_estimators)]
        _run(cmd, cwd=ROOT, dry_run=args.dry_run)

    return model_dir


def etapa_predicao(args, dest: Path, model_dir: Path, rscript: str) -> None:
    """6) Predição-TESTE anual (média da janela, ex.: 2015-2024) -> mapa .tif/.png.
    Python projeta na grade; o R prediz sobre as MESMAS células (gridX.csv).
    Com engine=ambos, fecha com a comparação Python×R."""
    _banner(f"ETAPA 6 — Predição anual de validação (média {args.janela}; engine: {args.engine})")

    slug = _slug(args.especie)
    nome_py = f"rf_{slug}_marinho"
    if not args.dry_run:
        import json
        avaliacao = model_dir / f'{nome_py}_eval.json'
        try:
            dados = json.loads(avaliacao.read_text(encoding='utf-8'))
            if dados.get('balanceamento', {}).get('proporcao') != '1:1':
                raise ValueError('Modelo marinho sem registro de treinamento 1:1; retreine e valide.')
        except (OSError, ValueError) as exc:
            raise SystemExit(f'[metodologia] {exc}') from exc
    joblib_path = model_dir / f"{nome_py}.joblib"
    rds_path = model_dir / f"{nome_py}_R.rds"
    gridx = model_dir / f"pred_{slug}_media{args.janela}_gridX.csv"
    gridx_r = model_dir / f"pred_{slug}_media{args.janela}_gridX_R.csv"
    tif_py = model_dir / f"pred_{slug}_media{args.janela}_adequabilidade.tif"
    tif_r = model_dir / f"pred_{slug}_media{args.janela}_adequabilidade_R.tif"

    precisa_py = args.engine in ("python", "ambos")
    if args.engine == "r" and (not gridx.exists() or not tif_py.exists()):
        print(f"[nota] engine=r, mas a grade/molde de predição ainda não existe. "
              f"A predição Python roda ANTES para montar a grade (baixa a climatologia do "
              f"CMEMS e exporta as células oceânicas) — o R prediz sobre as MESMAS células.",
              flush=True)
        precisa_py = True

    w, s, e, n = args.bbox
    if precisa_py:
        cmd = [sys.executable, str(PREDIZER_PY),
               "--model", str(joblib_path),
               "--bbox", str(w), str(s), str(e), str(n),
               "--janela", args.janela,
               "--batimetria", str(args.batimetria),
               "--outdir", str(model_dir),
               "--especie", args.especie]
        if args.depth_min is not None:
            cmd += ["--depth_min", str(args.depth_min)]
        if args.depth_max is not None:
            cmd += ["--depth_max", str(args.depth_max)]
        _run(cmd, cwd=ROOT, dry_run=args.dry_run)

    if args.engine in ("r", "ambos"):
        cmd = [rscript, str(PREDIZER_R), str(gridx), str(rds_path), str(gridx_r),
               str(tif_py), str(tif_r)]
        _run(cmd, cwd=ROOT, dry_run=args.dry_run)

    if args.engine == "ambos":
        _banner("COMPARAÇÃO Python × R (métricas, tempo e concordância dos mapas)")
        cmd = [sys.executable, str(COMPARAR),
               "--outdir", str(model_dir), "--slug", slug, "--janela", args.janela]
        _run(cmd, cwd=ROOT, dry_run=args.dry_run)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(
        prog="run_pipeline_ocean",
        description="Orquestrador linear do pipeline SDM OCEÂNICO: ocorrências marinhas -> "
                    "pseudo-ausências no oceano (batimetria) -> captura CMEMS diária -> QC com "
                    "gate -> Random Forest (Python e/ou R) -> predição anual de validação. "
                    "Use --engine para alternar Python x R (ambos = os dois + comparação).")
    p.add_argument("--especie", default="Pomatomus saltatrix",
                   help="Nome científico. Padrão: 'Pomatomus saltatrix' (espécie de referência).")
    p.add_argument("--engine", choices=("python", "r", "ambos"), default="ambos",
                   help="Framework da modelagem/predição: python (sklearn), r (randomForest) ou "
                        "ambos (roda os dois E compara ao final). Padrão: ambos. NOTA: o caminho "
                        "R reaproveita o split e a grade gerados pelo Python (comparação justa); "
                        "se faltarem, o passo Python correspondente roda automaticamente.")
    p.add_argument("--seed", type=int, default=42,
                   help="Semente (pseudo-ausências e split do modelo). Padrão: 42.")
    p.add_argument("--start", choices=STAGES, default="occ",
                   help="Etapa inicial (reaproveita saídas já existentes na pasta 07). Padrão: occ.")
    p.add_argument("--stop", choices=STAGES, default="predicao",
                   help="Última etapa a executar. Padrão: predicao (pipeline completo).")
    p.add_argument("--occ_csv", type=str, default=None,
                   help="CSV de ocorrências já pronto (pula o download da etapa 1).")
    p.add_argument("--outdir", type=str, default=None,
                   help="Pasta de saída explícita. Se omitido: '07 Executado por espécie/<Especie>/'.")
    p.add_argument("--dry_run", action="store_true",
                   help="Mostra o plano e os comandos SEM executar nada.")
    p.add_argument('--perfil', default=None,
                   help='Perfil oceânico; selecionado pelo cadastro da espécie quando omitido.')

    g0 = p.add_argument_group("Domínio de estudo")
    g0.add_argument("--bbox", type=float, nargs=4, default=list(BBOX_ATLANTICO_SUL),
                    metavar=("W", "S", "E", "N"),
                    help="Domínio (ocorrências, sorteio de pseudo e mapa de predição). "
                         "Padrão: Atlântico Sul (-70 -60 20 15). Global: -180 -90 180 90.")
    g0.add_argument("--min_year", type=int, default=ANO_MIN_MAR,
                    help=f"Ano mínimo das ocorrências. Padrão: {ANO_MIN_MAR} (era MODIS-Aqua).")
    g0.add_argument("--max_year", type=int, default=ANO_MAX_MAR,
                    help=f"Ano máximo das ocorrências. Padrão: {ANO_MAX_MAR}.")
    g0.add_argument("--batimetria", type=str, default=str(ROOT / "dados_entrada" / "ocean_depth.nc"),
                    help="NetCDF de batimetria (filtro de terra, faixa de profundidade, variável "
                         "'profundidade' e máscara da predição). Padrão: dados_entrada/ocean_depth.nc "
                         "(aceita GEBCO — detecção automática).")

    g1 = p.add_argument_group("Etapa 1 — ocorrências")
    g1.add_argument("--no-cache", dest="no_cache", action="store_true",
                    help="Desliga o cache de download das fontes.")

    g2 = p.add_argument_group("Etapa 2 — pseudo-ausências oceânicas")
    g2.add_argument("--radius_km", type=float, default=10,
                    help="Raio mínimo presença<->pseudo (km). Padrão: 10.")
    g2.add_argument("--ratio", type=float, default=1.0,
                    help="Razão pseudo:presença. Padrão: 1.0 (1:1).")
    g2.add_argument("--num_absences", type=int, default=0,
                    help="Nº absoluto de pseudo-ausências (0 = usa --ratio).")
    g2.add_argument("--depth_min", type=float, default=None,
                    help="Profundidade MÍNIMA (mais funda; valor NEGATIVO, ex.: -200). "
                         "Vazio = calculada da faixa das presenças oceânicas.")
    g2.add_argument("--depth_max", type=float, default=None,
                    help="Profundidade MÁXIMA (mais rasa; valor negativo perto de 0). "
                         "Vazio = calculada da faixa das presenças oceânicas.")

    g3 = p.add_argument_group("Etapa 3 — captura marinha (CMEMS)")
    g3.add_argument("--data_dir", type=str, default=str(ROOT / "dados_saida" / "cmarine"),
                    help="Cache dos NetCDF diários do CMEMS (resumível). Padrão: dados_saida/cmarine.")
    g3.add_argument("--max_workers", type=int, default=5,
                    help="Downloads paralelos na captura. Padrão: 5.")
    g3.add_argument("--retries", type=int, default=1,
                    help="Retentativas por arquivo do CMEMS. Padrão: 1.")

    g5 = p.add_argument_group("Etapas 5-6 — modelo e predição")
    g5.add_argument("--n_estimators", type=int, default=500,
                    help="Árvores do Random Forest (sklearn e randomForest). Padrão: 500.")
    g5.add_argument("--ano_modelo", type=int, default=None,
                    help="Treina somente com registros deste ano e projeta o mesmo ano. "
                         "As saídas ficam em modelo_rf_marinho_<ano>.")
    g5.add_argument("--janela", type=str, default="2015-2024",
                    help="Janela da climatologia da predição-teste (AAAA-AAAA). Padrão: 2015-2024.")
    g5.add_argument("--rscript", type=str, default=None,
                    help="Caminho do Rscript. Vazio = auto (PATH ou C:\\Program Files\\R\\R-*).")

    args = p.parse_args()
    import perfil as perfil_mod
    try:
        args.perfil = perfil_mod.selecionar_perfil(args.especie, args.perfil)
    except ValueError as exc:
        p.error(str(exc))
    perfil_mod.aplicar_perfil(args.perfil, args, p, sys.argv[1:], pipeline='ocean')
    from balanceamento import validar_proporcao
    validar_proporcao(args)
    args.bbox = tuple(args.bbox)
    if args.ano_modelo is not None:
        args.janela = f"{args.ano_modelo}-{args.ano_modelo}"

    i_start, i_stop = STAGES.index(args.start), STAGES.index(args.stop)
    if i_start > i_stop:
        raise SystemExit(f"[ERRO] --start ({args.start}) vem depois de --stop ({args.stop}).")

    # Rscript só é necessário se o engine envolve R e vamos chegar às etapas 5-6.
    precisa_r = args.engine in ("r", "ambos") and i_stop >= STAGES.index("modelo")
    rscript = _resolve_rscript(args.rscript, dry_run=args.dry_run) if precisa_r else "Rscript"

    slug = _slug(args.especie)
    dest = (Path(args.outdir).resolve() if args.outdir
            else _resolve_dest(slug, resuming=(args.start != "occ")))
    perfil_mod.registrar_metodologia(args, dest, 'run_pipeline_ocean.py')

    _banner(f"PIPELINE SDM OCEÂNICO — {args.especie}")
    print(f"Pasta da espécie : {dest}", flush=True)
    print(f"Etapas           : {' -> '.join(STAGES[i_start:i_stop + 1])}"
          + (" -> comparacao Py x R" if args.engine == "ambos" and i_stop >= STAGES.index("predicao")
             else ""), flush=True)
    print(f"Engine           : {args.engine} "
          f"({'sklearn' if args.engine == 'python' else 'randomForest (R)' if args.engine == 'r' else 'sklearn + randomForest + comparação'})", flush=True)
    print(f"Domínio          : bbox lon[{args.bbox[0]},{args.bbox[2]}] "
          f"lat[{args.bbox[1]},{args.bbox[3]}] | anos [{args.min_year},{args.max_year}]", flush=True)
    print(f"Batimetria       : {args.batimetria}", flush=True)
    print(f"Semente (seed)   : {args.seed}", flush=True)
    if args.ano_modelo is not None:
        print(f"Recorte do modelo: somente {args.ano_modelo}", flush=True)
    print(f"Execução         : {'DRY-RUN (nada será executado)' if args.dry_run else 'EXECUÇÃO'}",
          flush=True)
    if not args.dry_run and not Path(args.batimetria).exists():
        raise SystemExit(f"[ERRO] batimetria não encontrada: {args.batimetria}")

    occ_csv: Path | None = None
    if i_start <= STAGES.index("occ") <= i_stop:
        occ_csv = etapa_ocorrencias(args, dest)
    else:
        occ_csv = _find_occ_csv(dest)

    sp_csv: Path | None = None
    if i_start <= STAGES.index("pseudo") <= i_stop:
        sp_csv = etapa_pseudo(args, dest, occ_csv)

    var_csv: Path | None = None
    if i_start <= STAGES.index("captura") <= i_stop:
        if sp_csv is None:
            sp_csv = _find_sp_csv(dest)
        var_csv = etapa_captura(args, dest, sp_csv)

    if i_start <= STAGES.index("qc") <= i_stop:
        if var_csv is None:
            var_csv = _find_variables_marinho(dest)
        etapa_qc(args, dest, var_csv)

    model_dir: Path | None = None
    if i_start <= STAGES.index("modelo") <= i_stop:
        if var_csv is None:
            var_csv = _find_variables_marinho(dest)
        model_dir = etapa_modelo(args, dest, var_csv, rscript)

    if i_start <= STAGES.index("predicao") <= i_stop:
        if model_dir is None:
            sufixo_ano = f"_{args.ano_modelo}" if args.ano_modelo is not None else ""
            model_dir = dest / f"modelo_rf_marinho{sufixo_ano}"
        etapa_predicao(args, dest, model_dir, rscript)

    _banner("PIPELINE OCEÂNICO CONCLUÍDO")
    print(f"Resultados em: {dest}", flush=True)
    if not args.dry_run:
        vistos = set()
        for f in sorted(dest.rglob("*")):
            if not f.is_file() or f.suffix.lower() not in (
                    ".csv", ".png", ".html", ".json", ".txt", ".tif", ".joblib", ".rds"):
                continue
            if "raw" in f.parts:
                continue
            if f.name in vistos:
                continue
            vistos.add(f.name)
            print(f"  - {f.relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main()
