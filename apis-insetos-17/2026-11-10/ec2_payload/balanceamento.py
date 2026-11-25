"""Prepara dados de modelagem com classes 0/1 e proporção exata 1:1."""
from __future__ import annotations

import numpy as np
import pandas as pd


def validar_proporcao(args) -> None:
    if args.ratio != 1.0 or args.num_absences != 0:
        raise SystemExit('[balanceamento] Este processo exige --ratio 1.0 e --num_absences 0. '
                         'A quantidade será calculada após os filtros de presenças.')


def preparar_treino(df: pd.DataFrame, preditores: list[str], seed: int = 42):
    """Remove casos inválidos e reduz só a classe majoritária, sem duplicar linhas."""
    if not preditores:
        raise ValueError('Nenhum preditor disponível para o treinamento.')
    d = df.copy()
    d['sp'] = pd.to_numeric(d['sp'], errors='raise')
    if d['sp'].isna().any() or not d['sp'].isin([0, 1]).all():
        raise ValueError('sp deve conter apenas 0 (ausência) e 1 (presença).')
    for c in preditores:
        d[c] = pd.to_numeric(d[c], errors='coerce')
    d = d[np.isfinite(d[preditores].to_numpy(float)).all(axis=1)].copy()
    antes = {str(v): int((d['sp'] == v).sum()) for v in (0, 1)}
    n = min(antes.values())
    if n == 0:
        raise ValueError('Sem as duas classes após filtrar os preditores inválidos.')
    rng = np.random.default_rng(seed)
    selecionados = []
    for v in (0, 1):
        indices = np.flatnonzero(d['sp'].to_numpy() == v)
        selecionados.extend(rng.choice(indices, n, replace=False) if len(indices) > n else indices)
    d = d.iloc[sorted(selecionados)].reset_index(drop=True)
    info = {'proporcao': '1:1', 'metodo': 'subamostragem sem reposicao da classe majoritaria',
            'seed': seed, 'entrada': len(df), 'casos_completos': antes,
            'treino_balanceado': {'0': n, '1': n},
            'descartados_por_balanceamento': sum(antes.values()) - 2 * n}
    return d, info


def dividir_treino_teste(y, seed: int = 42):
    """Reserva a mesma quantidade de cada classe para teste e para treino."""
    y = np.asarray(y)
    classes = [np.flatnonzero(y == v) for v in (0, 1)]
    if len(classes[0]) != len(classes[1]) or sum(map(len, classes)) != len(y):
        raise ValueError('O split exige dados binários balanceados em 1:1.')
    n = len(classes[0])
    if n < 2:
        raise ValueError('São necessários pelo menos dois registros por classe.')
    n_teste = min(n - 1, max(1, int(np.ceil(0.3 * n))))
    rng = np.random.default_rng(seed)
    treino, teste = [], []
    for indices in classes:
        indices = rng.permutation(indices)
        teste.extend(indices[:n_teste]); treino.extend(indices[n_teste:])
    return rng.permutation(treino), rng.permutation(teste)


def validar_csv_treino(csv, extras: list[str] | None = None) -> list[str]:
    """Bloqueia predição com conjunto de treino legado ou preditores incompletos."""
    d = pd.read_csv(csv)
    if 'sp' not in d.columns:
        raise ValueError('CSV de treino sem coluna sp.')
    y = pd.to_numeric(d['sp'], errors='coerce')
    n0, n1 = int((y == 0).sum()), int((y == 1).sum())
    if n0 == 0 or n0 != n1 or not y.isin([0,1]).all():
        raise ValueError(f'Treino fora de 1:1: ausências={n0}, presenças={n1}. '
                         'Retreine e valide o modelo antes de gerar novos cenários.')
    faltando = set(extras or []) - set(d.columns)
    if faltando:
        raise ValueError('Treino não inclui preditores do perfil: '+', '.join(sorted(faltando)))
    preds = [c for c in d.columns if c not in ['sp','decimalLatitude','decimalLongitude']]
    if not preds or not np.isfinite(d[preds].apply(pd.to_numeric,errors='coerce').to_numpy()).all():
        raise ValueError('CSV de treino contém preditores não finitos ou não numéricos.')
    return preds
