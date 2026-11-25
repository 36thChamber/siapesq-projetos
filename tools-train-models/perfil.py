# perfil.py — Perfis de parâmetros por GRUPO TAXONÔMICO (raiz do projeto).
#
# Cada grupo tem um YAML em `perfis/<nome>.yaml` que codifica a receita do
# `documentation/manual_parametros_grupos.md` (seção 8, tabela-resumo). O dev roda:
#
#   python run_pipeline.py --especie "Ramphastos toco" --perfil aves
#
# e o perfil preenche as flags recomendadas (raio de pseudoausência, Área M, janela
# temporal, YAML de limpeza…) SEM precisar decorar o manual.
#
# REGRA DE PRECEDÊNCIA: flag passada EXPLICITAMENTE na linha de comando SEMPRE vence o
# perfil (detectado por presença da opção no argv — inclusive formas `--no-<flag>`).
# O perfil só preenche o que o dev não disse.
#
# Formato do YAML do perfil:
#   descricao: uma linha sobre o grupo
#   aviso: |            # (opcional) impresso em destaque no início da rodada
#     ...
#   bloqueio: |         # (opcional) aborta com esta mensagem (ex.: marinhos → outro orquestrador)
#     ...
#   flags:              # dest do argparse -> valor (aplicado se o dev não passou a opção)
#     radius_km: 20
#     config: 01_data_acquisition/occurrences/config_aves.yaml
#   notas:              # (opcional) lembretes impressos (ex.: itens REQUER IMPLEMENTAÇÃO)
#     - ...

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

import yaml

PERFIS_DIR = Path(__file__).resolve().parent / "perfis"
ESPECIES_FILE = Path(__file__).resolve().parent / "especies_perfis.yaml"


def carregar_perfil(nome: str, cadeia: tuple[str, ...] = ()) -> dict:
    """Lê um perfil, incluindo herança explícita de outro grupo."""
    if nome in cadeia:
        raise ValueError("Herança circular de perfis: " + " -> ".join((*cadeia, nome)))
    if nome not in listar_perfis():
        raise ValueError(f"Perfil '{nome}' inexistente. Disponíveis: {', '.join(listar_perfis())}")
    with (PERFIS_DIR / f"{nome}.yaml").open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Perfil '{nome}' deve ser um mapeamento YAML.")
    parent = carregar_perfil(data['herda'], (*cadeia, nome)) if data.get('herda') else {}
    return {**parent, **data,
            'flags': {**parent.get('flags', {}), **data.get('flags', {})},
            'notas': [*parent.get('notas', []), *data.get('notas', [])]}


def especies_cadastradas() -> dict[str, str]:
    with ESPECIES_FILE.open(encoding="utf-8") as f:
        return (yaml.safe_load(f) or {}).get('especies', {})


def selecionar_perfil(especie: str, nome: str | None = None) -> str:
    """Resolve o perfil por espécie; espécies novas exigem cadastro ou --perfil."""
    normalizar = lambda s: ' '.join(s.replace('_', ' ').split()).casefold()
    automatico = next((v for k, v in especies_cadastradas().items()
                       if normalizar(k) == normalizar(especie)), None)
    escolhido = nome or automatico
    if not escolhido:
        raise ValueError(f"Espécie '{especie}' sem perfil. Cadastre em especies_perfis.yaml "
                         "ou informe --perfil <grupo>.")
    data = carregar_perfil(escolhido)
    if automatico:
        esperado = carregar_perfil(automatico).get('pipeline', 'continental')
        if data.get('pipeline', 'continental') != esperado:
            raise ValueError(f"'{especie}' exige pipeline {esperado}; perfil '{escolhido}' incompatível.")
    return escolhido


def registrar_metodologia(args: argparse.Namespace, dest: Path, pipeline: str) -> None:
    """Registra os parâmetros efetivos da rodada, sem alterar o dry-run."""
    if args.dry_run:
        return
    dest.mkdir(parents=True, exist_ok=True)
    dados = {'especie': args.especie, 'perfil': args.perfil, 'pipeline': pipeline,
             'proporcao_treino_alvo': '1:1', 'registrado_utc': datetime.now(timezone.utc).isoformat(),
             'parametros': vars(args)}
    (dest/'metodologia_perfil.json').write_text(
        json.dumps(dados, ensure_ascii=False, indent=2, default=str), encoding='utf-8')


def listar_perfis() -> list[str]:
    if not PERFIS_DIR.is_dir():
        return []
    return sorted(p.stem for p in PERFIS_DIR.glob("*.yaml"))


def _opcoes_por_dest(parser: argparse.ArgumentParser) -> dict[str, list[str]]:
    """Mapeia dest -> todas as strings de opção (inclui '--no-<flag>' dos booleanos)."""
    out: dict[str, list[str]] = {}
    for a in parser._actions:  # noqa: SLF001 — argparse não expõe API pública p/ isso
        if a.option_strings:
            out.setdefault(a.dest, []).extend(a.option_strings)
    return out


def aplicar_perfil(nome: str, args: argparse.Namespace,
                   parser: argparse.ArgumentParser, argv: list[str],
                   pipeline: str = 'continental') -> None:
    """Aplica o perfil `nome` sobre `args`, respeitando flags explícitas do argv."""
    try:
        perfil = carregar_perfil(nome)
    except ValueError as exc:
        raise SystemExit(f"[perfil] {exc}") from exc

    esperado = perfil.get('pipeline', 'continental')
    if esperado != pipeline:
        script = 'run_pipeline_ocean.py' if esperado == 'ocean' else 'run_pipeline.py'
        raise SystemExit(f"[perfil] '{nome}' exige {script}. Use esse comando ou "
                         "run_pipeline_especies.py para selecionar automaticamente.")

    print(f"[perfil] {nome} — {perfil.get('descricao', '')}")

    if perfil.get("bloqueio"):
        raise SystemExit(f"[perfil] {nome}:\n{perfil['bloqueio']}")
    if perfil.get("aviso"):
        print(f"[perfil] AVISO:\n{perfil['aviso']}")

    opcoes = _opcoes_por_dest(parser)
    aplicadas, respeitadas = [], []
    for dest, valor in (perfil.get("flags") or {}).items():
        if dest not in opcoes:
            raise SystemExit(f"[perfil] chave não suportada pelo pipeline: {dest}")
        # Detecta a opção no argv nas duas formas: `--flag valor` e `--flag=valor`.
        if any(a == op or a.startswith(op + "=") for a in argv for op in opcoes[dest]):
            respeitadas.append(dest)          # o dev passou a flag: linha de comando vence
            continue
        setattr(args, dest, valor)
        aplicadas.append(f"{dest}={valor}")

    if aplicadas:
        print("[perfil] aplicado: " + " · ".join(aplicadas))
    if respeitadas:
        print("[perfil] mantido da linha de comando (vence o perfil): "
              + ", ".join(respeitadas))
    for nota in perfil.get("notas") or []:
        print(f"[perfil] nota: {nota}")
