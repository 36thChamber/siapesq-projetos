"""Cache-only inference helpers; imported by the explicitly authorized run driver."""
import hashlib
import json
from pathlib import Path

SPECIES = 'Eubalaena australis'
PROFILE = 'oceano_operacional_historico'
BBOX = [-90, -60, 55, 40]
TASKS = [('annual-2015-2024', '2015-2024', 'anual'),
         ('monthly-2025', '2025-2025', 'mensal')]


def need(ok, message):
    if not ok:
        raise RuntimeError(message)


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def preflight_caches(marine, old_run, depth):
    """Validate all 13 caches before any occurrence fetch or output mutation."""
    from strict_layers_draft import strict_cached_class
    cls = strict_cached_class(marine)
    rows = []
    for task, window, group in TASKS:
        layers = cls(bbox=BBOX, window=window, resolution=.1,
                     cache=Path(old_run)/'layers'/task,
                     cmems_cache=Path(old_run)/'cmems'/task, bathymetry=depth)
        for scenario in marine.scenarios(window, [group]):
            path, meta = layers.build(scenario)
            rows.append({'task': task, 'window': window, 'scenario': scenario.name,
                         'path': str(path), 'sha256': meta['sha256'],
                         'metadata_sha256': sha(path.with_suffix('.json'))})
    need(len(rows) == 13, 'Expected 13 validated environmental layers')
    return rows


def validate_model(runner, marine, model_dir):
    import joblib
    import numpy as np
    folder, model, evaluation = runner.find_model(SPECIES, str(model_dir))
    need(model.is_file(), 'Whale model absent')
    need(evaluation.get('especie') == SPECIES, 'Wrong evaluation species')
    need(set(evaluation.get('preditores', [])) == set(marine.PREDICTORS),
         'Wrong evaluation predictors')
    method_path = folder.parent/'metodologia_perfil.json'
    method = json.loads(method_path.read_text())
    need(method.get('especie') == SPECIES and method.get('perfil') == PROFILE,
         'Wrong methodology species/profile')
    need(method.get('pipeline') == 'run_pipeline_ocean.py', 'Wrong pipeline contract')
    # Metadata must separately disclose actual entrypoint and predictor extraction;
    # this compatibility field is NOT a claim the full pipeline was executed.
    need(runner.carregar_perfil(PROFILE).get('pipeline') == 'ocean', 'Non-ocean profile')
    bundle = joblib.load(model)
    predictors, forest = bundle['preditores'], bundle['modelo']
    need(len(predictors) == len(marine.PREDICTORS) and
         set(predictors) == set(marine.PREDICTORS), 'Wrong model predictors')
    need(list(forest.classes_) == [0, 1] and forest.n_features_in_ == len(predictors),
         'Wrong classifier classes/features')
    bounds = bundle.get('faixa_treino', evaluation.get('faixa_treino'))
    need(isinstance(bounds, dict), 'Training bounds missing')
    for v in predictors:
        a = np.asarray(bounds.get(v, []), dtype=float)
        need(a.shape == (2,) and np.isfinite(a).all() and a[0] <= a[1],
             'Invalid training bounds: ' + v)
    return {'folder': str(folder), 'model': str(model), 'model_sha256': sha(model),
            'evaluation_sha256': sha(folder/(model.stem+'_eval.json')),
            'methodology_sha256': sha(method_path), 'engine': 'python'}


def predict(runner, marine, old_run, depth, output, model_dir):
    """Annual first, then monthly; Python engine only, explicitly identified."""
    from strict_layers_draft import strict_cached_class
    block_prediction_network()
    output, old_run = Path(output).resolve(), Path(old_run).resolve()
    need(output != old_run and not output.is_relative_to(old_run) and
         not old_run.is_relative_to(output), 'Output overlaps source cache run')
    model = validate_model(runner, marine, model_dir)
    runner.MarineLayers = strict_cached_class(marine)
    for task, window, group in TASKS:
        argv = ['--especie', SPECIES, '--perfil', PROFILE, '--model_dir', model['folder'],
                '--grupos', group, '--janela', window, '--engine', 'python', '--jobs', '1',
                '--resolucao', '.1', '--bbox', *map(str, BBOX), '--batimetria', str(depth),
                '--outdir', str(output/task/'Eubalaena_australis'),
                '--cache', str(old_run/'layers'/task),
                '--cmems_cache', str(old_run/'cmems'/task), '--existentes', 'retomar']
        result = runner.main(argv)
        need(result in (0, None), 'Inference failed: ' + task)
    return model


def verify(marine, output, model, cache_rows):
    import numpy as np
    import rasterio
    import xarray as xr
    from rasterio.transform import from_origin
    output = Path(output)
    records = []
    for row in cache_rows:
        folder = output/row['task']/'Eubalaena_australis'/row['scenario']
        marker = json.loads((folder/'complete.json').read_text())
        need((marker.get('status'), marker.get('species'), marker.get('scenario')) ==
             ('complete', SPECIES, row['scenario']), 'Completion metadata differs')
        sig = marker['signature']
        need(sig.get('model_sha256') == model['model_sha256'] and
             sig.get('layers_sha256') == row['sha256'] and sig.get('engine') == 'python',
             'Model/layer/engine signature differs')
        entries = marker['files']
        names = [e['name'] for e in entries]
        need(len(names) == len(set(names)), 'Duplicate output manifest name')
        for entry in entries:
            name = entry['name']
            need(Path(name).name == name, 'Unsafe manifest filename')
            p = folder/name
            need(p.is_file() and p.stat().st_size == entry['bytes'] and
                 sha(p) == entry['sha256'], 'Output file integrity failure: ' + str(p))
            if p.suffix == '.tif':
                with rasterio.open(p) as ds:
                    need(ds.count == 1 and ds.shape == (1001, 1451) and
                         ds.crs and ds.crs.to_epsg() == 4326 and ds.nodata is not None,
                         'Wrong GeoTIFF grid/CRS/NoData')
                    need(ds.transform.almost_equals(from_origin(-90.05, 40.05, .1, .1)),
                         'Wrong GeoTIFF transform')
                    vals = ds.read(1, masked=True).compressed()
                    need(vals.size > 0 and np.isfinite(vals).all() and
                         vals.min() >= 0 and vals.max() <= 1, 'Invalid raster values')
        for suffix in ('_adequabilidade.tif', '_incerteza.tif', '_extrapolacao.tif', '_avaliacao.json'):
            need(sum(n.endswith(suffix) for n in names) == 1, 'Missing/ambiguous output ' + suffix)
        report = json.loads((folder/next(n for n in names if n.endswith('_avaliacao.json'))).read_text())
        primary = folder/next(n for n in names if n.endswith('_adequabilidade.tif'))
        with rasterio.open(primary) as ds:
            primary_values = ds.read(1, masked=True)
            count = primary_values.count()
            actual_valid = ~np.ma.getmaskarray(primary_values)
        with xr.open_dataset(row['path']) as layers:
            depth_values = layers.profundidade.transpose('lat', 'lon').values
            expected_valid = np.isfinite(depth_values) & (depth_values < 0)
            for v in marine.PREDICTORS:
                expected_valid &= np.isfinite(layers[v].transpose('lat', 'lon').values)
            if layers.lat.values[0] < layers.lat.values[-1]:
                expected_valid = expected_valid[::-1]
            need(np.array_equal(actual_valid, expected_valid), 'Predicted mask differs from source ocean mask')
        fraction = report.get('extrapolation_fraction')
        need(report.get('species') == SPECIES and report.get('scenario') == row['scenario'] and
             report.get('land_cells_predicted') == 0 and report.get('valid_ocean_cells') == count,
             'Report species/grid counts differ')
        need(isinstance(fraction, (int, float)) and np.isfinite(fraction) and 0 <= fraction <= 1,
             'Invalid extrapolation fraction')
        records.append({'task': row['task'], 'scenario': row['scenario'],
                        'valid_cells': int(count), 'extrapolation_fraction': fraction})
    need(len(records) == 13, 'Expected 13 verified primary maps')
    return {'status': 'passed', 'primary_maps': 13, 'records': records,
            'note': 'Integrity QA is not ecological validation; Python model, random validation split.'}


def block_prediction_network():
    """One-way Python audit guard, installed after occurrence acquisition.

    Known Python network/process access is denied. This is defense in depth,
    not an OS security sandbox for arbitrary native libraries or untrusted code.
    Run inference in an OS network-disabled environment when one is available.
    """
    import socket
    import sys
    def deny(event, args):
        if event == 'socket.__new__' and args[1] in (socket.AF_INET, socket.AF_INET6):
            raise RuntimeError('OFFLINE PREDICTION: IP socket creation blocked')
        if event in ('socket.connect', 'socket.connect_ex', 'socket.getaddrinfo',
                     'socket.gethostbyname', 'socket.gethostbyaddr', 'subprocess.Popen',
                     'os.system', 'os.posix_spawn'):
            raise RuntimeError('OFFLINE PREDICTION: network/process operation blocked: ' + event)
    sys.addaudithook(deny)


def main(argv=None):
    import argparse
    import fcntl
    import importlib.metadata
    import os
    import sys
    import zipfile
    sys.dont_write_bytecode = True
    p = argparse.ArgumentParser(description='Read-only cache preflight; --run predicts 13 whale maps, annual first. No environmental downloads.')
    p.add_argument('--release', type=Path, required=True)
    p.add_argument('--old-run', type=Path, required=True)
    p.add_argument('--depth', type=Path, required=True)
    p.add_argument('--model-dir', type=Path, required=True)
    p.add_argument('--outdir', type=Path, required=True)
    p.add_argument('--run', action='store_true')
    args = p.parse_args(argv)
    release, old_run, output = args.release.resolve(), args.old_run.resolve(), args.outdir.resolve()
    for protected in (release, old_run, args.model_dir.resolve()):
        need(output != protected and not output.is_relative_to(protected) and
             not protected.is_relative_to(output), 'Output overlaps protected source/model directory')
    sys.path.insert(0, str(release/'ste'))
    import marine_scenarios as marine
    import run_predicoes_cenarios_ocean as runner
    # Import heavy dependencies before the one-way network audit hook.
    import numpy, xarray, rasterio, joblib, sklearn, netCDF4
    block_prediction_network()
    caches = preflight_caches(marine, old_run, args.depth)
    model = validate_model(runner, marine, args.model_dir)
    contract = {'schema': 1, 'species': SPECIES, 'profile': PROFILE, 'engine': 'python',
                'bbox': BBOX, 'resolution': .1, 'models': model, 'caches': caches,
                'depth_sha256': sha(args.depth),
                'versions': {m:importlib.metadata.version(m) for m in
                             ('numpy','xarray','rasterio','joblib','scikit-learn','netCDF4')},
                'sources': {str(f):sha(f) for f in [Path(__file__),
                    Path(__file__).with_name('strict_layers_draft.py'),
                    release/'ste'/'marine_scenarios.py',
                    release/'ste'/'run_predicoes_cenarios_ocean.py',
                    release/'ste'/'prediction_state.py']}}
    print(json.dumps({'preflight':'passed','primary_maps':13,'model':model,'run':args.run},indent=2),flush=True)
    if not args.run:
        return 0
    output.mkdir(parents=True, exist_ok=True)
    def atomic(path, data):
        temporary = path.with_suffix(path.suffix+'.partial')
        temporary.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
        os.replace(temporary,path)
    with (output/'run.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        cp = output/'contract.json'
        if cp.exists():
            need(json.loads(cp.read_text()) == contract, 'Run contract differs; use a separate output folder')
        else:
            need(not any(q.name != 'run.lock' for q in output.iterdir()), 'Untracked files in output folder')
            atomic(cp,contract)
        atomic(output/'status.json',{'phase':'predicting','order':'annual then monthly'})
        try:
            predict(runner,marine,old_run,args.depth,output/'outputs',args.model_dir)
            qa = verify(marine,output/'outputs',model,caches)
            atomic(output/'qa.json',qa)
            files = sorted([f for f in (output/'outputs').rglob('*') if f.is_file() and '_backups' not in f.parts])
            files += [cp,output/'qa.json']
            manifest = output/'SHA256SUMS.txt'
            manifest.write_text(''.join(f'{sha(f)}  {f.relative_to(output).as_posix()}\n' for f in files))
            target = output/'Eubalaena_australis_13_mapas_python.zip'
            temporary = target.with_suffix('.zip.partial')
            with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,compresslevel=4) as z:
                for f in files+[manifest]: z.write(f,f.relative_to(output).as_posix())
            with zipfile.ZipFile(temporary) as z:
                need(z.testzip() is None,'ZIP CRC failed')
            os.replace(temporary,target)
            atomic(output/'status.json',{'phase':'complete','primary_maps':13,
                                        'zip':str(target),'zip_sha256':sha(target)})
            print(str(target),flush=True)
        except BaseException as exc:
            atomic(output/'status.json',{'phase':'failed','error':f'{type(exc).__name__}: {exc}'})
            raise
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
