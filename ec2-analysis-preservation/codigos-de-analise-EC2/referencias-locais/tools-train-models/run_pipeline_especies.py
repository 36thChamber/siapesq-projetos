#!/usr/bin/env python3
"""Seleciona pipeline/perfil para uma espécie ou para listas, com auditoria prévia."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
import shlex
import subprocess
import sys

from perfil import carregar_perfil, especies_cadastradas, selecionar_perfil

ROOT = Path(__file__).resolve().parent


def plano(especies: list[str], perfil: str | None = None) -> list[dict]:
    itens = []
    for especie in especies:
        nome = selecionar_perfil(especie, perfil)
        data = carregar_perfil(nome)
        if data.get('bloqueio'):
            raise ValueError(f"Perfil '{nome}' bloqueado: {data['bloqueio']}")
        script = 'run_pipeline_ocean.py' if data.get('pipeline') == 'ocean' else 'run_pipeline.py'
        itens.append({'especie': especie, 'perfil': nome, 'pipeline': script})
    return itens


def ler_listas(caminhos: list[Path]) -> list[str]:
    listas = []
    for caminho in caminhos:
        nomes = [' '.join(s.replace('_', ' ').split())
                 for s in caminho.read_text(encoding='utf-8-sig').splitlines()
                 if s.strip() and not s.lstrip().startswith('#')]
        listas.append(list(dict.fromkeys(nomes)))
    contagem = Counter(n for lista in listas for n in lista)
    uniao = list(dict.fromkeys(n for lista in listas for n in lista))
    # Quando há duas listas, prioriza a interseção; depois as espécies exclusivas.
    return sorted(uniao, key=lambda n: -contagem[n])


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    escolha = p.add_mutually_exclusive_group()
    escolha.add_argument('--especie')
    escolha.add_argument('--lista', type=Path, action='append', help='Repetível: união sem duplicatas.')
    p.add_argument('--perfil', default=None, help='Sobrescreve o grupo, respeitando o ambiente da espécie.')
    p.add_argument('--auditar_perfis', action='store_true', help='Só confere perfis; nenhum pipeline executado.')
    p.add_argument('--dry_run', action='store_true')
    p.add_argument('--relatorio', type=Path, help='Grava a auditoria/estado de execução em JSON.')
    p.add_argument('--outroot', type=Path, default=ROOT/'07 Executado por espécie',
                   help='Raiz das saídas; cada espécie terá uma nova pasta datada.')
    args, extras = p.parse_known_args()
    nomes = [args.especie] if args.especie else ler_listas(args.lista) if args.lista else list(especies_cadastradas())
    if not nomes:
        p.error('Lista vazia.')
    if not args.especie and not args.lista and not args.auditar_perfis:
        p.error('Informe --especie ou --lista; use --auditar_perfis para conferir todo o cadastro.')
    try:
        itens = plano(nomes, args.perfil)
    except ValueError as exc:
        p.error(str(exc))
    if args.auditar_perfis and extras:
        p.error('Flags de execução não se aplicam a --auditar_perfis.')
    def salvar():
        if args.relatorio:
            args.relatorio.parent.mkdir(parents=True, exist_ok=True)
            args.relatorio.write_text(json.dumps(itens, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.auditar_perfis:
        salvar()
        for item in itens:
            print(f"{item['especie']}: {item['pipeline']} --perfil {item['perfil']}")
        print(f'Perfis conferidos: {len(itens)}/{len(nomes)}')
        return
    # Uma pasta explícita única misturaria espécies em lote.
    if len(itens) > 1 and any(e == '--outdir' or e.startswith('--outdir=') for e in extras):
        p.error('Em lote use --outroot; --outdir é permitido apenas para uma espécie.')
    for item in itens:
        encaminhadas = list(extras)
        for i, e in enumerate(encaminhadas):
            for flag in ('--start', '--stop'):
                if e == flag and i+1 < len(encaminhadas):
                    valor = encaminhadas[i+1]
                    if item['pipeline'] == 'run_pipeline_ocean.py' and valor == 'modelagem':
                        encaminhadas[i+1] = 'modelo'
                    elif item['pipeline'] == 'run_pipeline.py' and valor == 'modelo':
                        encaminhadas[i+1] = 'modelagem'
                elif e.startswith(flag+'='):
                    valor = e.split('=', 1)[1]
                    if item['pipeline'] == 'run_pipeline_ocean.py' and valor == 'modelagem':
                        encaminhadas[i] = flag+'=modelo'
                    elif item['pipeline'] == 'run_pipeline.py' and valor == 'modelo':
                        encaminhadas[i] = flag+'=modelagem'
        if not any(e == '--outdir' or e.startswith('--outdir=') for e in encaminhadas):
            slug = item['especie'].replace(' ', '_')
            destino = args.outroot/slug/(date.today().isoformat()+'-perfil-1x1')
            encaminhadas += ['--outdir', str(destino.resolve())]
        cmd = [sys.executable, str(ROOT/item['pipeline']), '--especie', item['especie'],
               '--perfil', item['perfil'], *encaminhadas]
        if args.dry_run:
            cmd += ['--dry_run']
        item['comando'] = shlex.join(cmd)
        print(item['comando'], flush=True)
        item['status'] = 'iniciando'
        salvar()
        result = subprocess.run(cmd, cwd=ROOT)
        item['status'] = 'dry_run' if args.dry_run and result.returncode == 0 else 'concluido' if result.returncode == 0 else 'falhou'
        item['returncode'] = result.returncode
        salvar()
        if result.returncode:
            raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
