#!/usr/bin/env python3
# run_predicoes_cenarios.py — Roda os 17 CENÁRIOS de predição de UMA espécie.
#
# Para cada pasta de cenário em "predict variables/", projeta o modelo `.sdm` climatológico
# e grava o mapa de adequabilidade + incerteza + o mapa de EXTRAPOLAÇÃO.
#
# Os 17 cenários: 1 anual (validação) + 12 mensais + 4 futuros (2050/2100 × SSP2-4.5/SSP5-8.5).
#
# CUSTO: ~27 min por cenário por espécie (medido). 17 cenários ≈ 8 h para uma espécie.
# RESUMÍVEL de duas formas: o driver R pula o cenário cujo .tif já existe, e dentro de um
# cenário ele checkpointa por faixa de latitude — matar no meio não perde o que já rodou.
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe run_predicoes_cenarios.py --especie "Sapajus nigritus"
#   .venv/Scripts/python.exe run_predicoes_cenarios.py --especie "Sapajus nigritus" --grupos mensal
#   .venv/Scripts/python.exe run_predicoes_cenarios.py --especie "Sapajus nigritus" --dry_run

from __future__ import annotations

import argparse
import glob
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import naming  # noqa: E402

CENARIOS_DIR = ROOT / "predict variables"
PREDICT_R = ROOT / "04_modeling" / "run_predict_climatologico.R"
EXTRAP_PY = ROOT / "04_modeling" / "mapa_extrapolacao.py"
COERENCIA_PY = ROOT / "04_modeling" / "teste_coerencia_ecologica.py"
BASE07 = ROOT / "07 Executado por espécie"


def _p(m: str = "") -> None:
    print(m, flush=True)


def _banner(t: str) -> None:
    _p(f"\n{'=' * 78}\n>> {t}\n{'=' * 78}")


def _resolve_rscript(explicito: str | None, dry_run: bool) -> str:
    """O R quase nunca está no PATH no Windows — procura na instalação padrão."""
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
        return "Rscript"
    raise SystemExit("[ERRO] Rscript não encontrado. Instale o R ou passe --rscript <caminho>.")


def achar_modelo(especie: str, model_dir: str | None) -> tuple[Path, str]:
    """Localiza a pasta do modelo climatológico e o nome do `.sdm`.

    Sem --model_dir, pega o `.sdm` climatológico MAIS RECENTE da espécie: as rodadas ficam
    em subpastas datadas (2026-07-17/...), e a mais nova é a que vale."""
    if model_dir:
        d = Path(model_dir)
        sdms = sorted(d.glob("*.sdm"))
        if not sdms:
            raise SystemExit(f"[ERRO] nenhum .sdm em {d}")
        return d, sdms[0].stem
    slug = naming.slug_especie(especie)
    cands = [p for p in (BASE07 / slug).rglob("*.sdm") if "climatologico" in str(p.parent).lower()]
    if not cands:
        raise SystemExit(
            f"[ERRO] nenhum modelo climatológico (.sdm) para '{especie}' em {BASE07 / slug}.\n"
            f"  Treine antes: python run_pipeline.py --especie \"{especie}\" --start modelagem")
    cands.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    escolhido = cands[0]
    _p(f"[modelo] usando o mais recente: {escolhido.relative_to(ROOT)}")
    return escolhido.parent, escolhido.stem


def listar_cenarios(grupos: list[str]) -> list[Path]:
    """Pastas de cenário completas (7 camadas). Ignora as que ainda não fecharam —
    o NDVI mensal e o CMIP6 chegam em tempos diferentes."""
    if not CENARIOS_DIR.exists():
        raise SystemExit(
            f"[ERRO] {CENARIOS_DIR} não existe. Monte antes:\n"
            f"  python 03_environmental_processing/montar_predict_variables.py")
    PREDITORES = ["t2m", "e", "tp", "ndvi", "altitude", "awc", "ocup_solo_mapbiomas"]
    out = []
    for d in sorted(CENARIOS_DIR.iterdir()):
        if not d.is_dir():
            continue
        if grupos and d.name.split("_")[0] not in grupos:
            continue
        faltam = [c for c in PREDITORES if not (d / f"{c}.tif").exists()]
        if faltam:
            _p(f"[cenário] {d.name}: INCOMPLETO (faltam {', '.join(faltam)}) — pulando.")
            continue
        out.append(d)
    return out


def rodar(especie: str, model_dir: Path, model_name: str, cenarios: list[Path],
          rscript: str, out_base: Path, dry_run: bool, pular_extrap: bool) -> None:
    slug = naming.slug_especie(especie)
    treino_csv = model_dir / "predictor_climatologico.csv"
    if not treino_csv.exists() and not pular_extrap:
        _p(f"[aviso] {treino_csv.name} não existe — mapas de extrapolação serão pulados.")
        pular_extrap = True

    for i, cen in enumerate(cenarios, start=1):
        _banner(f"[{i}/{len(cenarios)}] {especie} — cenário {cen.name}")
        destino = out_base / cen.name
        destino.mkdir(parents=True, exist_ok=True)
        out_mean = destino / f"{slug}_{cen.name}_adequabilidade.tif"
        out_sd = destino / f"{slug}_{cen.name}_incerteza.tif"

        if out_mean.exists() and out_sd.exists():
            _p(f"[pred] já existe: {out_mean.name} — pulando.")
        else:
            cmd = [rscript, str(PREDICT_R), str(model_dir), model_name,
                   str(cen), str(out_mean), str(out_sd)]
            _p(f"$ Rscript run_predict_climatologico.R ... {cen.name}")
            if dry_run:
                _p("  [dry-run] etapa NÃO executada.")
            else:
                rc = subprocess.run(cmd, cwd=str(ROOT)).returncode
                if rc != 0:
                    _p(f"[ERRO] cenário {cen.name} falhou (código {rc}) — seguindo para o próximo.")
                    continue

        if not pular_extrap:
            # Grava na pasta da ESPÉCIE, não na do cenário: a faixa de treino é do modelo
            # daquela espécie, e a pasta do cenário é compartilhada por todas.
            cmd = [sys.executable, str(EXTRAP_PY), "--cenario", str(cen),
                   "--treino", str(treino_csv), "--outdir", str(destino),
                   "--prefixo", f"{slug}_{cen.name}_"]
            if dry_run:
                _p(f"  [dry-run] mapa de extrapolação de {cen.name}")
            else:
                subprocess.run(cmd, cwd=str(ROOT))

            # COERÊNCIA ECOLÓGICA a cada cenário, não só no fim: um modelo que inverte a
            # distribuição da espécie precisa aparecer em minutos, não depois de horas de
            # rodada. Foi assim que o modelo diário do Sapajus passou despercebido.
            cmd = [sys.executable, str(COERENCIA_PY), "--mapa", str(out_mean),
                   "--treino", str(treino_csv),
                   "--json", str(destino / f"{slug}_{cen.name}_coerencia.json")]
            if dry_run:
                _p(f"  [dry-run] teste de coerência de {cen.name}")
            elif out_mean.exists():
                subprocess.run(cmd, cwd=str(ROOT))

    _banner("PREDIÇÕES CONCLUÍDAS")
    _p(f"Resultados em: {out_base}")


def main() -> None:
    p = argparse.ArgumentParser(description="Roda os 17 cenários de predição de uma espécie.")
    p.add_argument("--especie", required=True)
    p.add_argument("--grupos", default="",
                   help="Subconjunto: anual, mensal, futuro (vírgula). Vazio = todos.")
    p.add_argument("--model_dir", default=None,
                   help="Pasta do .sdm. Vazio = o climatológico mais recente da espécie.")
    p.add_argument("--outdir", default=None,
                   help="Pasta de saída. Vazio = 07/<Especie>/predicoes_cenarios/.")
    p.add_argument("--rscript", default=None)
    p.add_argument("--sem_extrapolacao", action="store_true",
                   help="Não gerar o mapa de extrapolação de cada cenário.")
    p.add_argument("--dry_run", action="store_true")
    a = p.parse_args()

    grupos = [g.strip() for g in a.grupos.split(",") if g.strip()]
    model_dir, model_name = achar_modelo(a.especie, a.model_dir)
    cenarios = listar_cenarios(grupos)
    out_base = (Path(a.outdir) if a.outdir
                else BASE07 / naming.slug_especie(a.especie) / "predicoes_cenarios")
    rscript = _resolve_rscript(a.rscript, a.dry_run)

    _banner(f"PREDIÇÕES POR CENÁRIO — {a.especie}")
    _p(f"Modelo    : {model_dir / (model_name + '.sdm')}")
    _p(f"Cenários  : {len(cenarios)} completos {[c.name for c in cenarios]}")
    _p(f"Saída     : {out_base}")
    _p(f"Execução  : {'DRY-RUN' if a.dry_run else 'EXECUÇÃO'}")
    if not cenarios:
        raise SystemExit("[ERRO] nenhum cenário completo. Monte as camadas antes.")

    rodar(a.especie, model_dir, model_name, cenarios, rscript, out_base,
          a.dry_run, a.sem_extrapolacao)


if __name__ == "__main__":
    main()
