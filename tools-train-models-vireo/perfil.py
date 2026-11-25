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
from pathlib import Path

import yaml

PERFIS_DIR = Path(__file__).resolve().parent / "perfis"


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
                   parser: argparse.ArgumentParser, argv: list[str]) -> None:
    """Aplica o perfil `nome` sobre `args`, respeitando flags explícitas do argv."""
    caminho = PERFIS_DIR / f"{nome}.yaml"
    if not caminho.is_file():
        disponiveis = ", ".join(listar_perfis()) or "(nenhum — crie perfis/<nome>.yaml)"
        raise SystemExit(f"[perfil] '{nome}' não existe. Disponíveis: {disponiveis}")
    with open(caminho, "r", encoding="utf-8") as f:
        perfil = yaml.safe_load(f) or {}

    print(f"[perfil] {nome} — {perfil.get('descricao', '')}")

    if perfil.get("bloqueio"):
        raise SystemExit(f"[perfil] {nome}:\n{perfil['bloqueio']}")
    if perfil.get("aviso"):
        print(f"[perfil] AVISO:\n{perfil['aviso']}")

    opcoes = _opcoes_por_dest(parser)
    aplicadas, respeitadas = [], []
    for dest, valor in (perfil.get("flags") or {}).items():
        if dest not in opcoes:
            print(f"[perfil] chave desconhecida no perfil (ignorada): {dest}")
            continue
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
