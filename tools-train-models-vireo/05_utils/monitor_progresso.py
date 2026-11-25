#!/usr/bin/env python3
# monitor_progresso.py — PAINEL AO VIVO do progresso da predicao (ou de qualquer processo
# que escreva `_progress.txt`). Redesenha a tela a cada `--intervalo` segundos, mostrando
# uma barra por processo, ate todos concluirem (ou Ctrl+C).
#
# Cada `_progress.txt` tem UMA linha:  fase<TAB>feito<TAB>total<TAB>pct<TAB>msg<TAB>segundos
# (escrita pelo run_predict_climatologico.R). O % GERAL combina as fases por peso.
#
# Uso:
#   python 05_utils/monitor_progresso.py                # ao vivo (Ctrl+C p/ sair)
#   python 05_utils/monitor_progresso.py --once         # UM quadro e sai
#   python 05_utils/monitor_progresso.py --duracao 60   # roda 60 s e sai
#   python 05_utils/monitor_progresso.py --intervalo 3  # ritmo do repaint
#   python 05_utils/monitor_progresso.py <dir1> <dir2>  # dirs especificos
#
# Se a saida NAO for um terminal (ex.: capturada por `!` no Claude Code, ou redirecionada
# p/ arquivo), NAO limpa a tela: imprime um quadro por vez, em sequencia — senao os codigos
# ANSI viram lixo e nada aparece ate o processo morrer. Nesses casos use --once/--duracao.

from __future__ import annotations

import glob
import os
import sys
import time

# Windows: o console usa cp1252 e quebra com os blocos █/· e as bordas. Força utf-8.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
except Exception:  # noqa: BLE001
    pass

# Faixa de % GERAL que cada fase ocupa (a predicao domina o tempo).
FASES = {
    "carregando": (0, 4), "reamostra": (4, 40), "predicao": (4, 95),
    "ensemble": (95, 99), "concluido": (100, 100), "done": (100, 100),
}
LARG = 34  # largura da barra


def _descobrir() -> list[str]:
    base = "07 Executado por espécie"
    return sorted({os.path.dirname(p) for p in
                   glob.glob(f"{base}/*/*/**/_progress.txt", recursive=True)})


def _ler(dir_: str):
    try:
        with open(os.path.join(dir_, "_progress.txt"), encoding="utf-8") as f:
            partes = f.readline().strip().split("\t")   # .strip() remove \r\n do Windows
        fase, feito, total, pct, msg, seg = (partes + [""] * 6)[:6]
        return dict(fase=fase, feito=int(feito or 0), total=int(total or 1),
                    pct=int(pct or 0), msg=msg, seg=int(seg or 0))
    except Exception:
        return None


def _geral(st: dict) -> int:
    lo, hi = FASES.get(st["fase"], (0, 100))
    frac = st["feito"] / st["total"] if st["total"] else 0
    return int(round(lo + (hi - lo) * min(max(frac, 0), 1)))


def _barra(pct: int, larg: int = LARG) -> str:
    cheio = int(round(larg * pct / 100))
    return "█" * cheio + "·" * (larg - cheio)


def _hms(seg: int) -> str:
    if seg >= 3600:
        return f"{seg // 3600}h{(seg % 3600) // 60:02d}"
    if seg >= 60:
        return f"{seg // 60}min{seg % 60:02d}"
    return f"{seg}s"


def _nome(dir_: str) -> str:
    # .../07 Executado por espécie/<Especie>/<data>/modelo_rf_climatologico
    p = dir_.replace("\\", "/").split("/")
    for i, seg in enumerate(p):
        if "Executado" in seg and i + 1 < len(p):
            return p[i + 1]
    return os.path.basename(dir_)


def _quadro(dirs, intervalo, limpar: bool) -> bool:
    """Desenha um quadro. Retorna True se todos os processos concluiram."""
    if limpar:
        print("\033[2J\033[H", end="")   # limpa tela + volta ao topo (so em terminal)
    print("═" * (LARG + 40))
    print(f" MONITOR DE PREDICAO — {len(dirs)} processo(s)   "
          f"({time.strftime('%H:%M:%S')}; atualiza a cada {intervalo:.0f}s)")
    print("═" * (LARG + 40))
    todos_ok = True
    for d in dirs:
        st = _ler(d)
        nome = _nome(d)
        if st is None:
            print(f" {nome:22} [{'·' * LARG}]   --  (aguardando início)")
            todos_ok = False
            continue
        g = _geral(st)
        if st["fase"] not in ("concluido", "done"):
            todos_ok = False
        extra = (f"{st['fase']} {st['feito']}/{st['total']} {st['msg']}"
                 if st["fase"] not in ("concluido", "done") else f"OK — {st['msg']}")
        print(f" {nome:22} [{_barra(g)}] {g:3d}%  {_hms(st['seg']):>7}  {extra}")
    print("═" * (LARG + 40), flush=True)
    return todos_ok


def main():
    argv = [a for a in sys.argv[1:]]
    intervalo, duracao, once = 2.0, None, False
    if "--once" in argv:
        once = True; argv.remove("--once")
    if "--intervalo" in argv:
        i = argv.index("--intervalo"); intervalo = float(argv[i + 1]); del argv[i:i + 2]
    if "--duracao" in argv:
        i = argv.index("--duracao"); duracao = float(argv[i + 1]); del argv[i:i + 2]
    dirs = argv or _descobrir()
    if not dirs:
        print("Nenhum _progress.txt encontrado (nenhuma predicao em andamento).")
        return

    # So limpa a tela se a saida for um TERMINAL de verdade. Capturada/redirecionada,
    # os codigos ANSI viram lixo — entao imprime um quadro por vez, em sequencia.
    limpar = sys.stdout.isatty()
    if once:
        _quadro(dirs, intervalo, limpar=False)
        return
    t0 = time.time()
    try:
        while True:
            if _quadro(dirs, intervalo, limpar):
                print(" TODOS CONCLUIDOS.")
                break
            if duracao is not None and (time.time() - t0) >= duracao:
                print(f" (fim dos {duracao:.0f}s — os processos seguem rodando)")
                break
            time.sleep(intervalo)
    except KeyboardInterrupt:
        print("\n(monitor encerrado — os processos seguem rodando)")


if __name__ == "__main__":
    main()
