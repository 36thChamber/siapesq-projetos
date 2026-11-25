"""Confronta a projeção com o TIFF publicado para a mesma espécie, data, grade e produto."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def compare_maps(ref, new):
    with rasterio.open(ref) as a, rasterio.open(new) as b:
        if (a.crs, a.transform, a.shape, a.count) != (b.crs, b.transform, b.shape, b.count):
            raise ValueError(f"Grades incompatíveis para {new.name}")
        x = a.read(1, masked=True).filled(np.nan)
        y = b.read(1, masked=True).filled(np.nan)
        valid_x, valid_y = np.isfinite(x), np.isfinite(y)
        shared = valid_x & valid_y
        if not shared.any():
            raise ValueError(f"Não há pixels válidos em comum para {new.name}")
        x = x[shared].astype('float64')
        y = y[shared].astype('float64')
        dif = y - x
        return {
            'validos_referencia': int(valid_x.sum()), 'validos_replay': int(valid_y.sum()),
            'mascara_divergente': int((valid_x != valid_y).sum()), 'validos_comuns': len(x),
            'pixels_diferentes': int((dif != 0).sum()), 'erro_absoluto_medio': float(np.abs(dif).mean()),
            'rmse': float(np.sqrt(np.mean(dif**2))), 'erro_maximo': float(np.abs(dif).max()),
            'correlacao_pearson': float(np.corrcoef(x,y)[0,1]) if x.std() and y.std() else None,
            'media_referencia': float(x.mean()), 'media_replay': float(y.mean()),
        }


def compare_day(source, run):
    if source.name != run.name:
        raise ValueError('Datas de referência e projeção distintas')
    output = {}
    for manifest in sorted(run.glob('*/complete.json')):
        sid = manifest.parent.name
        reference = source / sid
        old = json.loads((reference/'complete.json').read_text())
        new = json.loads(manifest.read_text())
        for record in old, new:
            if record['status']!='complete' or record['signature']['layers']['data_date']!=run.name:
                raise ValueError(f'Produto incompleto ou data divergente em {sid}')
        ref_sig,new_sig=old['signature'],new['signature']
        maps = {}
        for kind in ('mean','sd','extrapolacao'):
            name = f'{sid}_rf_{run.name}_{kind}.tif'
            for record, root in ((old, reference), (new, manifest.parent)):
                expected = next(x for x in record['files'] if x['name'] == name)
                if digest(root/name)!=expected['sha256']:
                    raise ValueError(f'Arquivo diverge do manifesto: {root/name}')
            maps[kind] = compare_maps(reference/name,manifest.parent/name)
        output[sid] = {'modelo_original_sha256': ref_sig['model_sha256'], 'modelo_replay_sha256':new_sig['model_sha256'],
                       'sha_entradas_referencia':ref_sig['layers']['input_sha256'],
                       'sha_entradas_replay':new_sig['layers']['input_sha256'], 'mapas':maps}
    if not output:raise ValueError('Rodada sem resultados para comparar')
    return {'data':run.name,'especies':output}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('referencias',type=Path);p.add_argument('resultados',type=Path);p.add_argument('relatorio',type=Path)
    args=p.parse_args()
    report=compare_day(args.referencias,args.resultados)
    tmp=args.relatorio.with_suffix('.tmp')
    tmp.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n');tmp.replace(args.relatorio)
    print(len(report['especies']),'espécies comparadas')
