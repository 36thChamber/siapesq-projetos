#!/usr/bin/env python3
# run_pipeline.py - Orquestrador LINEAR do pipeline SDM (um comando, ponta a ponta).
#
# Encadeia as etapas do pipeline para UMA espécie, cuidando automaticamente do
# "handoff" de arquivos entre elas (nomes + pasta), que antes era manual:
#
#   1) Ocorrências  (01_data_acquisition/occurrences)  -> Occurrence_<Especie>_*.csv
#   2) Pseudo-aus.  (02_pseudoabsence)                 -> Pseudoabsence_<Especie>_*.csv
#   3) Captura amb. (03_environmental_processing)      -> Variables[Climatologico]_*.csv (+ QC)
#   4) Modelagem RF (04_modeling/run_rf_climatologico.R)  -> modelo_rf_climatologico/*.sdm + AUC/TSS
#   5) Predição     (04_modeling/run_predict_climatologico.R) -> mapa adequabilidade + incerteza (.tif)
#
# PADRÃO = pipeline CONTINENTAL do Brasil, modo CLIMATOLÓGICO (nicho médio 2015-2024, 7
# preditores), recorte ao território (--clip_brasil) e Área M por ecorregiões. Vai por padrão
# até a MODELAGEM (--stop modelagem); o mapa do Brasil (etapa 5, horas/espécie) é opt-in via
# --stop predicao. Espécies marinhas: caminho ALTERNATIVO --ocean_only (força modo diário).
#
# Tudo é gravado em:  07 Executado por espécie/<Genero_especie>/
# (a convenção de pasta que as etapas seguintes já esperam encontrar).
#
# A limpeza/filtragem está EMBUTIDA na etapa 1 (pacote cleaning/), então roda
# junto com a aquisição — não é uma etapa separada aqui.
#
# EXECUTE SEMPRE DA RAIZ DO PROJETO (convenção do projeto: caminhos padrão são
# resolvidos relativos ao diretório atual):
#
#   python run_pipeline.py --especie "Leontopithecus rosalia" --seed 42
#
# Comece de uma etapa intermediária (reaproveitando saídas já existentes na
# pasta 07 da espécie):
#
#   python run_pipeline.py --especie "Leontopithecus rosalia" --start pseudo --seed 42
#   python run_pipeline.py --especie "Leontopithecus rosalia" --start captura
#
# Injete um CSV de ocorrências já pronto (pula o download):
#
#   python run_pipeline.py --especie "Leontopithecus rosalia" --occ_csv caminho/dados.csv --seed 42
#
# Veja o plano SEM executar nada (valida a fiação/caminhos, custo zero):
#
#   python run_pipeline.py --especie "Leontopithecus rosalia" --dry_run

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import naming  # convenção de nomes das saídas (Tipo_Genero_especie_DD_MM_AA)

ROOT = Path(__file__).resolve().parent
ACQ_DIR = ROOT / "01_data_acquisition"
PSEUDO_SCRIPT = ROOT / "02_pseudoabsence" / "gen_pseudo_occurences.py"
# Captação ambiental: SIMULTÂNEA por padrão (todas as variáveis de uma vez, ~2 h a menos
# por espécie; valores idênticos aos da sequencial). `--sequencial` cai na variante que
# capta uma variável de cada vez.
CAPTURA_DIR = ROOT / "03_environmental_processing"
CAPTURA_SIMULTANEO = CAPTURA_DIR / "captura_ambiental_simultaneo.py"
CAPTURA_SEQUENCIAL = CAPTURA_DIR / "captura_ambiental.py"
BASE07 = ROOT / "07 Executado por espécie"

# Etapas 4-5 (modelagem/predição): drivers em R do conjunto CLIMATOLÓGICO.
MODELAGEM_RF = ROOT / "04_modeling" / "run_rf_climatologico.R"
PREDICT_RF = ROOT / "04_modeling" / "run_predict_climatologico.R"
# Pasta de rasters de predição do Brasil (1 .tif por preditor). Compartilhada por todas as
# espécies; montada por 03_environmental_processing/montar_rasters_predicao.py.
PRED_DIR_DEFAULT = ROOT / "env_data" / "predicao_brasil_2015_2024"

# Pré-filtro grosso de bbox da Etapa 1 (aquisição). O recorte FINO ao território é feito
# depois por --clip_brasil (polígono real do Brasil, malha IBGE). lon/lat cobrindo o país;
# espécies marinhas (--ocean_only) ignoram este bbox. Ordem: (min_lon, min_lat, max_lon, max_lat).
BRASIL_BBOX = (-74.0, -34.0, -34.0, 6.0)
ANO_MIN_BRASIL, ANO_MAX_BRASIL = 2000, 2024  # janela de ocorrências do pipeline continental

STAGES = ("occ", "pseudo", "captura", "modelagem", "predicao")  # ordem canônica do pipeline


# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------
def _slug(especie: str) -> str:
    """Mesma convenção da etapa 3 (captura): 'Genero especie' -> 'Genero_especie'."""
    return especie.strip().replace(" ", "_")


def _banner(titulo: str) -> None:
    linha = "=" * 78
    print(f"\n{linha}\n>> {titulo}\n{linha}", flush=True)


def _resolve_dest(slug: str, resuming: bool) -> Path:
    """Pasta da espécie em 07/.

    - Run completo (--start occ): usa a pasta EXATA `07/<slug>/` (nova e limpa,
      sem tocar em pastas anotadas como '<slug> - poucos dados').
    - Resume (--start pseudo/captura): se a exata não existe, reaproveita uma
      pasta existente `07/<slug>*` (mesma semântica de busca da etapa 3/captura).
    """
    exact = BASE07 / slug
    if resuming and not exact.exists():
        matches = sorted(d for d in BASE07.glob(f"{slug}*") if d.is_dir())
        if matches:
            return matches[0]
    return exact


def _find_occ_csv(dest: Path) -> Path | None:
    """CSV de OCORRÊNCIAS (só presenças) na pasta da espécie.

    Aceita o nome NOVO (`Occurrence_<Esp>_<DD_MM_AA>.csv`) e os LEGADOS
    (`<Esp>_occurrences.csv`) — uma rodada antiga tem de continuar retomável.
    """
    return naming.achar("occurrence", dest)


def _find_sp_csv(dest: Path) -> Path | None:
    """CSV de presenças + pseudoausências.

    Nome NOVO: `Pseudoabsence_<Esp>_<DD_MM_AA>.csv`. Legado: `sp_*_occurrences.csv`.
    """
    return naming.achar("pseudoabsence", dest)


def _run(cmd: list[str], cwd: Path, dry_run: bool) -> None:
    """Executa uma etapa (stdout/stderr herdados = barra de progresso ao vivo)."""
    # Exibe o comando de forma legível (esconde o caminho longo do interpretador):
    # "python" para o próprio interpretador; senão o nome do executável (ex.: Rscript).
    launcher = "python" if cmd[0] == sys.executable else Path(cmd[0]).stem
    mostrar = " ".join(f'"{c}"' if " " in c else c for c in cmd[1:])
    print(f"$ (cd {cwd}) {launcher} {mostrar}", flush=True)
    if dry_run:
        print("  [dry-run] etapa NÃO executada.", flush=True)
        return
    res = subprocess.run(cmd, cwd=str(cwd))
    if res.returncode != 0:
        raise SystemExit(f"\n[ERRO] etapa falhou (código {res.returncode}). Pipeline interrompido.")


def _resolve_rscript(explicito: str | None, dry_run: bool = False) -> str:
    """Localiza o executável do R (`Rscript`). O R costuma NÃO estar no PATH no Windows,
    então além do `--rscript` explícito e do PATH, procura na instalação padrão
    (`C:\\Program Files\\R\\R-*\\bin\\Rscript.exe`) e usa a versão mais recente."""
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


# ---------------------------------------------------------------------------
# Etapas
# ---------------------------------------------------------------------------
def etapa_ocorrencias(args, dest: Path) -> Path:
    """1) Aquisição multi-fonte -> grava Occurrence_<Esp>_<DD_MM_AA>.csv na pasta."""
    _banner("ETAPA 1 — Ocorrências (todas as fontes) + limpeza/filtragem")

    # Caminho A: usuário injetou um CSV pronto -> copia para a pasta da espécie.
    if args.occ_csv:
        origem = Path(args.occ_csv).resolve()
        if not origem.exists():
            raise SystemExit(f"[ERRO] --occ_csv não encontrado: {origem}")
        destino = dest / naming.nome("occurrence", args.especie, dest, "csv")
        print(f"Usando CSV informado: {origem}\n  -> {destino}", flush=True)
        if not args.dry_run:
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origem, destino)
        return destino

    # Caminho B: baixa das fontes. Roda de dentro de 01_data_acquisition (o
    # pacote `occurrences` só é importável a partir dali) e força a saída para a
    # pasta 07 da espécie via --output-dir.
    cmd = [sys.executable, "-m", "occurrences",
           "--species", args.especie,
           "--output-dir", str(dest)]
    if args.config:
        # A aquisição muda para ACQ_DIR; resolva o caminho informado na raiz
        # do comando antes de trocar de diretório (inclusive configs do perfil).
        config_path = Path(args.config).expanduser().resolve()
        if not config_path.is_file() and not Path(args.config).is_absolute():
            config_path = (ROOT / args.config).resolve()
        cmd += ["--config", str(config_path)]
    if args.no_cache:
        cmd += ["--no-cache"]
    if args.min_lon is not None and args.max_lon is not None:
        cmd += ["--min-lon", str(args.min_lon), "--max-lon", str(args.max_lon)]
    if args.min_lat is not None and args.max_lat is not None:
        cmd += ["--min-lat", str(args.min_lat), "--max-lat", str(args.max_lat)]
    if args.min_year is not None and args.max_year is not None:
        cmd += ["--min-year", str(args.min_year), "--max-year", str(args.max_year)]

    if not args.dry_run:
        dest.mkdir(parents=True, exist_ok=True)
    _run(cmd, cwd=ACQ_DIR, dry_run=args.dry_run)

    occ = _find_occ_csv(dest)
    if occ is None and not args.dry_run:
        raise SystemExit(f"[ERRO] etapa 1 não gerou *_occurrences.csv em {dest}")
    return occ if occ is not None else dest / f"{_slug(args.especie)}_occurrences.csv"


def etapa_pseudo(args, dest: Path, occ_csv: Path) -> Path:
    """2) Pseudo-ausências -> Pseudoabsence_<Esp>_<DD_MM_AA>.csv na pasta da espécie."""
    _banner("ETAPA 2 — Pseudo-ausências (reprodutível via --seed)")

    if occ_csv is None or (not occ_csv.exists() and not args.dry_run):
        raise SystemExit(f"[ERRO] etapa 2 exige o CSV de ocorrências (não encontrado em {dest}).")

    cmd = [sys.executable, str(PSEUDO_SCRIPT),
           "--csv", str(occ_csv),
           "--species_name", args.especie,
           "--seed", str(args.seed),
           "--radius_km", str(args.radius_km),
           "--ratio", str(args.ratio)]
    if args.num_absences:
        cmd += ["--num_absences", str(args.num_absences)]
    if args.clip_brasil:
        cmd += ["--clip_brasil"]
    if args.ocean_only:
        cmd += ["--ocean_only", "--bathymetry_input", args.bathymetry_input]
    if args.use_ecoregions:
        cmd += ["--use_ecoregions", "--area_buffer_km", str(args.area_buffer_km),
                "--area_min_frac", str(args.area_min_frac),
                "--area_max_dist_km", str(args.area_max_dist_km)]
        if args.keep_presences_outside_area:
            cmd += ["--keep_presences_outside_area"]

    # O gerador grava DIRETO na pasta da espécie (ao lado do CSV de entrada), com o nome
    # da convenção. Antes ele gravava `sp_<entrada>.csv` no diretório atual e o
    # orquestrador tinha de MOVER o arquivo — um passo a mais só para dar errado.
    _run(cmd, cwd=ROOT, dry_run=args.dry_run)

    destino = dest / naming.nome("pseudoabsence", args.especie, dest, "csv")
    if args.dry_run:
        print(f"  [dry-run] geraria {destino}", flush=True)
        return destino
    if not destino.exists():
        raise SystemExit(f"[ERRO] etapa 2 não gerou {destino}")
    print(f"Pseudo-ausências -> {destino}", flush=True)
    return destino


def etapa_captura(args, dest: Path, sp_csv: Path | None = None) -> None:
    """3) Captura ambiental (+ QC automático) -> variáveis + laudo .html.

    Dois modos (via `--modo`): `climatologico` (padrão do pipeline continental — amostra a
    média 2015-2024 dos rasters do Brasil nos pontos, 7 preditores) ou `daily` (baixa o clima
    do dia de cada registro). A captura delega para `captura_climatologica.py` quando
    climatológico; ambos partilham a mesma CLI (`captura_ambiental.py::main`)."""
    if args.modo == "climatologico":
        modo = "CLIMATOLÓGICA (média 2015–2024 amostrada nos pontos, 7 preditores)"
    else:
        modo = "SEQUENCIAL (uma variável de cada vez)" if args.sequencial \
            else "SIMULTÂNEA (todas as variáveis de uma vez)"
    _banner(f"ETAPA 3 — Captura de variáveis ambientais — {modo}  (QC roda no fim)")

    script = CAPTURA_SEQUENCIAL if args.sequencial else CAPTURA_SIMULTANEO
    cmd = [sys.executable, str(script), "--modo", args.modo,
           "--max_workers", str(args.max_workers), "--painel_seg", str(args.painel_seg)]
    # Preferimos --csv explícito (funciona em subpasta datada e evita ambiguidade
    # quando a espécie tem várias pastas). Só caímos no --especie (glob) se não
    # tivermos o caminho do sp_*.csv.
    if sp_csv is not None:
        cmd += ["--csv", str(sp_csv)]
    else:
        cmd += ["--especie", args.especie]
    if args.vars:  # vazio = deixa a captura aplicar seu próprio padrão continental
        cmd += ["--vars", args.vars]
    if args.dem:
        cmd += ["--dem", args.dem]
    if args.modo == "climatologico":  # opt-ins repassados a capturar_climatologico
        cmd += ["--uso_solo", args.uso_solo]
        if args.com_amplitudes:
            cmd += ["--com_amplitudes"]
        if args.com_riparios:
            cmd += ["--com_riparios"]

    _run(cmd, cwd=ROOT, dry_run=args.dry_run)


def etapa_modelagem(args, dest: Path) -> tuple[Path, str]:
    """4) Treina Random Forest sobre o CSV climatológico e gera avaliação (AUC/TSS/…).

    Delega para `04_modeling/run_rf_climatologico.R`. Grava o `.sdm` + relatórios em
    `07/<Especie>/modelo_rf_climatologico/`. Só faz sentido no modo climatológico."""
    _banner("ETAPA 4 — Modelagem Random Forest (climatológico, R)")

    csv = naming.achar("variables_climatologico", dest, recursivo=True)
    if csv is None and not args.dry_run:
        raise SystemExit(
            f"[ERRO] etapa 4 não encontrou o CSV climatológico (VariablesClimatologico_*.csv) "
            f"em {dest}. Rode a etapa de captura no modo climatologico antes.")

    model_dir = dest / "modelo_rf_climatologico"
    model_name = f"rf_{naming.slug_especie(args.especie)}_clima"
    rscript = _resolve_rscript(args.rscript, dry_run=args.dry_run)

    if not args.dry_run:
        model_dir.mkdir(parents=True, exist_ok=True)
    csv_str = str(csv) if csv is not None else "<VariablesClimatologico_*.csv>"
    extras = []
    if args.com_amplitudes:
        extras += ['t2m_amp', 'e_amp', 'tp_amp', 'ndvi_amp']
    if args.com_riparios:
        extras += ['dist_rio', 'pct_floresta_500m']
    uso_solo = 'ocup_solo_' + args.uso_solo
    cmd = [rscript, str(MODELAGEM_RF), csv_str, str(model_dir), model_name,
           str(args.n_reps), uso_solo, ','.join(extras), str(args.seed)]
    _run(cmd, cwd=ROOT, dry_run=args.dry_run)
    print(f"Modelo RF -> {model_dir / (model_name + '.sdm')}", flush=True)
    return model_dir, model_name


def etapa_predicao(args, dest: Path, model_dir: Path, model_name: str) -> None:
    """5) Projeta o modelo sobre os rasters do Brasil -> mapa de adequabilidade + incerteza.

    Delega para `04_modeling/run_predict_climatologico.R`. Sem --pred_bbox, projeta o
    BRASIL INTEIRO (custa horas/espécie a 250 m, mas é resumível/checkpointado)."""
    _banner("ETAPA 5 — Predição: mapa de adequabilidade do Brasil (R)")

    if not args.dry_run:
        from balanceamento import validar_csv_treino
        extras = ['t2m_amp','e_amp','tp_amp','ndvi_amp'] if args.com_amplitudes else []
        if args.com_riparios:
            extras += ['dist_rio','pct_floresta_500m']
        try:
            validar_csv_treino(model_dir/'predictor_climatologico.csv', extras)
        except (OSError, ValueError) as exc:
            raise SystemExit(f'[metodologia] {exc}') from exc

    pred_dir = Path(args.predictors_dir)
    if not pred_dir.exists() and not args.dry_run:
        raise SystemExit(
            f"[ERRO] etapa 5: pasta de rasters de predição não existe: {pred_dir}. "
            f"Monte-a com: python 03_environmental_processing/montar_rasters_predicao.py")

    out_mean = model_dir / f"{model_name}_adequabilidade_brasil_mean.tif"
    out_sd = model_dir / f"{model_name}_incerteza_brasil_sd.tif"
    rscript = _resolve_rscript(args.rscript, dry_run=args.dry_run)

    cmd = [rscript, str(PREDICT_RF), str(model_dir), model_name, str(pred_dir),
           str(out_mean), str(out_sd)]
    if args.pred_bbox:  # vazio = Brasil inteiro
        cmd += [args.pred_bbox]
    _run(cmd, cwd=ROOT, dry_run=args.dry_run)
    print(f"Mapa de adequabilidade -> {out_mean}", flush=True)
    print(f"Mapa de incerteza      -> {out_sd}", flush=True)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(
        prog="run_pipeline",
        description="Orquestrador linear do pipeline SDM. PADRÃO: continental Brasil, modo "
                    "climatológico (occ -> pseudo -> captura+QC -> modelagem RF). Mapa do Brasil "
                    "(predição) via --stop predicao. Espécies marinhas: --ocean_only.",
    )
    p.add_argument("--especie", required=True, help="Nome científico (ex.: 'Leontopithecus rosalia').")
    p.add_argument("--perfil", type=str, default=None,
                   help="Perfil de parâmetros por grupo taxonômico (perfis/<nome>.yaml): "
                        "preenche as flags recomendadas pelo manual_parametros_grupos.md; "
                        "flag explícita na linha de comando sempre vence. "
                        "Ex.: aves, insetos, plantas, repteis, peixes_agua_doce, mamiferos.")
    p.add_argument("--seed", type=int, default=42,
                   help="Semente das pseudo-ausências (reprodutibilidade). Padrão: 42.")
    p.add_argument("--start", choices=STAGES, default="occ",
                   help="Etapa inicial (reaproveita saídas já existentes na pasta 07). Padrão: occ.")
    p.add_argument("--stop", choices=STAGES, default="modelagem",
                   help="Última etapa a executar. Padrão: modelagem (treina o RF e avalia). "
                        "Use --stop predicao p/ também gerar o mapa do Brasil (horas/espécie); "
                        "--stop captura p/ parar no CSV de treino.")
    p.add_argument("--occ_csv", type=str, default=None,
                   help="CSV de ocorrências já pronto (pula o download da etapa 1).")
    p.add_argument("--outdir", type=str, default=None,
                   help="Pasta de saída explícita (ex.: '07 Executado por espécie/<Especie>/<data>/'). "
                        "Se omitido, usa '07 Executado por espécie/<Especie>/'.")
    p.add_argument("--dry_run", action="store_true",
                   help="Mostra o plano e os caminhos SEM executar nada.")

    # --- passagem para a ETAPA 1 (ocorrências) ---
    g1 = p.add_argument_group("Etapa 1 — ocorrências")
    g1.add_argument("--config", type=str, default=None, help="YAML de config das fontes de ocorrência.")
    g1.add_argument("--no-cache", dest="no_cache", action="store_true", help="Desliga o cache de download.")
    g1.add_argument("--min_lon", type=float, default=None)
    g1.add_argument("--max_lon", type=float, default=None)
    g1.add_argument("--min_lat", type=float, default=None)
    g1.add_argument("--max_lat", type=float, default=None)
    g1.add_argument("--min_year", type=int, default=None)
    g1.add_argument("--max_year", type=int, default=None)

    # --- passagem para a ETAPA 2 (pseudo-ausências) ---
    g2 = p.add_argument_group("Etapa 2 — pseudo-ausências")
    g2.add_argument("--radius_km", type=float, default=10, help="Raio mínimo presença↔pseudo (km). Padrão: 10.")
    g2.add_argument("--num_absences", type=int, default=0,
                    help="Nº absoluto de pseudo-ausências. 0 = usa --ratio (padrão 1:1).")
    g2.add_argument("--ratio", type=float, default=1.0,
                    help="Razão pseudo:presença quando --num_absences=0. 1.0 = 1:1 (padrão). "
                         "2.0 reproduz o comportamento antigo (2×presenças).")
    g2.add_argument("--clip_brasil", action=argparse.BooleanOptionalAction, default=True,
                    help="LIGADO por padrão (pipeline Brasil): usa APENAS presenças dentro do "
                         "polígono real do Brasil (malha IBGE) e confina as pseudo-ausências ao "
                         "país (intersecta a Área M com o Brasil). Use --no-clip_brasil para "
                         "desligar (auto-desligado em modo marinho --ocean_only).")
    g2.add_argument("--ocean_only", action="store_true", help="Gera pseudo apenas no oceano (espécies marinhas).")
    g2.add_argument("--bathymetry_input", type=str, default="dados_entrada/ocean_depth.nc",
                    help="NetCDF de batimetria (usado com --ocean_only).")
    g2.add_argument("--use_ecoregions", action=argparse.BooleanOptionalAction, default=True,
                    help="Restringe a Área M às ecorregiões RESOLVE 2017 que contêm presenças. "
                         "PADRÃO do pipeline (ligado). Use --no-use_ecoregions para desligar "
                         "(auto-desligado em modo marinho --ocean_only).")
    g2.add_argument("--area_buffer_km", type=float, default=0.0, help="Buffer (km) da Área M.")
    g2.add_argument("--area_min_frac", type=float, default=0.005,
                    help="Fração mínima (0.005=0,5%%) de presenças p/ uma ecorregião entrar na "
                         "Área M — remove ecorregiões com poucos registros (misID). 0 desliga.")
    g2.add_argument("--area_max_dist_km", type=float, default=200.0,
                    help="RECORTE da Área M: distância máx. (km) de uma pseudoausência à presença "
                         "mais próxima. As ecorregiões RESOLVE são grossas (a do Cerrado vai de SP "
                         "ao Maranhão) — sem o recorte, sorteiam-se pseudoausências a 1.400 km da "
                         "espécie, o que infla o AUC e faz o modelo aprender BIOMA, não HABITAT. "
                         "0 desliga. Padrão: 200.")
    g2.add_argument("--keep_presences_outside_area", action="store_true",
                    help="Não remover presenças fora das ecorregiões de ocorrência (por padrão, "
                         "presenças fora da Área M pós-filtro são removidas p/ coerência).")

    # --- passagem para a ETAPA 3 (captura) ---
    g3 = p.add_argument_group("Etapa 3 — captura ambiental")
    g3.add_argument("--vars", type=str, default="",
                    help="Lista de variáveis (vírgula). Vazio = padrão continental da captura.")
    g3.add_argument("--dem", type=str, default=None, help="GeoTIFF de altitude (default da captura se vazio).")
    g3.add_argument("--max_workers", type=int, default=5, help="Threads na captura. Padrão: 5.")
    g3.add_argument("--sequencial", action="store_true",
                    help="Capta UMA variável de cada vez (captura_ambiental.py). Por padrão, "
                         "capta TODAS de uma vez (captura_ambiental_simultaneo.py) — mesmos "
                         "valores, ~2 h a menos por espécie.")
    g3.add_argument("--painel_seg", type=float, default=20.0,
                    help="Intervalo (s) do painel ao vivo da captura (barras, ritmo, MB/min). "
                         "0 desliga. Padrão: 20.")
    g3.add_argument("--uso_solo", choices=["mapbiomas", "worldcover"], default="mapbiomas",
                    help="[climatologico] Categórica de uso do solo (worldcover = global, "
                         "p/ área de treino com países vizinhos). Padrão: mapbiomas.")
    g3.add_argument("--com_amplitudes", action="store_true",
                    help="[climatologico] Soma as amplitudes sazonais {t2m,e,tp,ndvi}_amp "
                         "(essencial p/ ectotermos; ver manual_parametros_grupos.md).")
    g3.add_argument("--com_riparios", action="store_true",
                    help="[climatologico] Soma dist_rio e pct_floresta_500m (janela RS).")
    g3.add_argument("--modo", choices=["climatologico", "daily"], default="climatologico",
                    help="Representação temporal do clima/NDVI. climatologico (PADRÃO): média "
                         "2015-2024 amostrada nos pontos (nicho médio, 7 preditores). daily: baixa "
                         "o clima do dia de cada registro (dinâmico). Marinho (--ocean_only) força daily.")

    # --- passagem para as ETAPAS 4-5 (modelagem RF + predição, drivers em R) ---
    g4 = p.add_argument_group("Etapas 4-5 — modelagem RF + predição (R)")
    g4.add_argument("--n_reps", type=int, default=10,
                    help="Réplicas bootstrap do Random Forest (ensemble + incerteza). Padrão: 10.")
    g4.add_argument("--rscript", type=str, default=None,
                    help="Caminho do Rscript. Vazio = auto (PATH ou C:\\Program Files\\R\\R-*).")
    g4.add_argument("--predictors_dir", type=str, default=str(PRED_DIR_DEFAULT),
                    help="Pasta de rasters de predição do Brasil (1 .tif por preditor). "
                         f"Padrão: {PRED_DIR_DEFAULT.name}.")
    g4.add_argument("--pred_bbox", type=str, default="",
                    help="Recorte da predição 'W,S,E,N'. Vazio = BRASIL INTEIRO (padrão).")

    args = p.parse_args()

    # --- PERFIL POR GRUPO: preenche as flags recomendadas pelo manual; a linha de
    # comando explícita sempre vence (ver perfil.py e perfis/README.md).
    import perfil as perfil_mod
    try:
        args.perfil = perfil_mod.selecionar_perfil(args.especie, args.perfil)
    except ValueError as exc:
        p.error(str(exc))
    perfil_mod.aplicar_perfil(args.perfil, args, p, sys.argv[1:])
    from balanceamento import validar_proporcao
    validar_proporcao(args)

    # --- MODO MARINHO (caminho alternativo). A metodologia climatológica, as ecorregiões
    # RESOLVE e o recorte-Brasil são TERRESTRES. Em --ocean_only forçamos o caminho diário e
    # desligamos os filtros continentais, mantendo o caminho oceânico coerente.
    if args.ocean_only:
        p.error('Espécies oceânicas devem usar run_pipeline_ocean.py ou run_pipeline_especies.py.')

    # --- PRÉ-FILTRO BRASIL (continental). Sem bbox/anos informados, aplica o bbox do território
    # e a janela 2000-2024 (o recorte FINO é do --clip_brasil). Não força nada em modo marinho.
    if not args.ocean_only:
        if args.min_lon is None and args.max_lon is None:
            args.min_lon, args.max_lon = BRASIL_BBOX[0], BRASIL_BBOX[2]
        if args.min_lat is None and args.max_lat is None:
            args.min_lat, args.max_lat = BRASIL_BBOX[1], BRASIL_BBOX[3]
        if args.min_year is None:
            args.min_year = ANO_MIN_BRASIL
        if args.max_year is None:
            args.max_year = ANO_MAX_BRASIL

    # --vars vazio => a etapa 3 (captura) aplica seu próprio padrão continental.
    i_start, i_stop = STAGES.index(args.start), STAGES.index(args.stop)
    if i_start > i_stop:
        raise SystemExit(f"[ERRO] --start ({args.start}) vem depois de --stop ({args.stop}).")

    # Modelagem/predição integradas são CLIMATOLÓGICAS (drivers R do nicho médio). No modo
    # daily/marinho o pipeline vai só até a captura; treino/mapa ficam como passo manual.
    if args.modo != "climatologico" and i_stop > STAGES.index("captura"):
        print(f"[nota] modo '{args.modo}': etapas de modelagem/predição (climatológicas) não se "
              f"aplicam — parando na captura.", flush=True)
        i_stop = STAGES.index("captura")

    slug = _slug(args.especie)
    dest = (Path(args.outdir).resolve() if args.outdir
            else _resolve_dest(slug, resuming=(args.start != "occ")))
    perfil_mod.registrar_metodologia(args, dest, 'run_pipeline.py')

    _banner(f"PIPELINE SDM — {args.especie}")
    print(f"Pasta da espécie : {dest}", flush=True)
    print(f"Etapas           : {' -> '.join(STAGES[i_start:i_stop + 1])}", flush=True)
    print(f"Metodologia      : modo={args.modo} | clip_brasil={args.clip_brasil} | "
          f"ecorregiões={args.use_ecoregions}", flush=True)
    if not args.ocean_only:
        print(f"Pré-filtro Brasil: bbox lon[{args.min_lon},{args.max_lon}] "
              f"lat[{args.min_lat},{args.max_lat}] | anos [{args.min_year},{args.max_year}]", flush=True)
    print(f"Semente (seed)   : {args.seed}", flush=True)
    print(f"Execução         : {'DRY-RUN (nada será executado)' if args.dry_run else 'EXECUÇÃO'}", flush=True)

    occ_csv: Path | None = None
    if i_start <= STAGES.index("occ") <= i_stop:
        occ_csv = etapa_ocorrencias(args, dest)
    else:
        occ_csv = _find_occ_csv(dest)  # começou depois: usa o que já existe

    sp_csv: Path | None = None
    if i_start <= STAGES.index("pseudo") <= i_stop:
        sp_csv = etapa_pseudo(args, dest, occ_csv)

    if i_start <= STAGES.index("captura") <= i_stop:
        if sp_csv is None:
            sp_csv = _find_sp_csv(dest)
        etapa_captura(args, dest, sp_csv)

    model_dir: Path | None = None
    model_name: str | None = None
    if i_start <= STAGES.index("modelagem") <= i_stop:
        model_dir, model_name = etapa_modelagem(args, dest)

    if i_start <= STAGES.index("predicao") <= i_stop:
        if model_dir is None:  # começou depois da modelagem: usa a convenção de nomes
            model_dir = dest / "modelo_rf_climatologico"
            model_name = f"rf_{naming.slug_especie(args.especie)}_clima"
        etapa_predicao(args, dest, model_dir, model_name)

    _banner("PIPELINE CONCLUÍDO")
    print(f"Resultados em: {dest}", flush=True)
    if not args.dry_run:
        # Todas as saídas da rodada, na convenção Tipo_Genero_especie_DD_MM_AA (naming.py).
        vistos = set()
        for f in sorted(dest.rglob("*")):
            if not f.is_file() or f.suffix.lower() not in (".csv", ".png", ".html", ".json", ".txt"):
                continue
            if "raw" in f.parts or "variable_distributions" in f.parts:
                continue  # brutos por provider e figuras individuais: ruído aqui
            if f.name in vistos:
                continue
            vistos.add(f.name)
            display_path = f.relative_to(ROOT) if f.is_relative_to(ROOT) else f
            print(f"  - {display_path}", flush=True)


if __name__ == "__main__":
    main()
