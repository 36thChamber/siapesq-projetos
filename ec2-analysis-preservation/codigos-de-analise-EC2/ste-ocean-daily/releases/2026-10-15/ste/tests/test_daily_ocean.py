"""Offline scientific/operational contract for STE -> daily SIAPRESP integration."""
import csv
import json
from pathlib import Path
import tempfile
import unittest

import joblib
import numpy as np
import rasterio
from sklearn.ensemble import RandomForestClassifier
import xarray as xr

from run_predicoes_diarias_ocean import load_models, main, prepare_layers, project_model


class DailyOceanTest(unittest.TestCase):
    def fixture(self, root):
        inputs = root / 'daily'
        inputs.mkdir()
        coords = {'latitude': [-11., -10., -9.], 'longitude': [-40., -39., -38.]}
        fields = {'thetao': (20., 'degrees_C'), 'so': (35., '1e-3'),
                  'CHL': (10., 'mg m-3'), 'depth': (-100., 'm')}
        files = {}
        for name, (value, units) in fields.items():
            values = np.full((3, 3), value)
            if name == 'depth':
                values[0, 0] = 100.  # land
            if name == 'CHL':
                values[2, 2] = 0.  # invalid log10
            array = xr.DataArray(values, dims=('latitude', 'longitude'), coords=coords, attrs={'units': units})
            array.to_dataset(name=name).to_netcdf(inputs / f'{name}.nc')
            files[name] = f'{name}.nc'
        (inputs / 'manifest.json').write_text(json.dumps({'data_date': '2026-10-12', 'files': files}))
        folder = root / 'model_run' / 'modelo_rf_marinho'
        folder.mkdir(parents=True)
        (folder.parent / 'metodologia_perfil.json').write_text(json.dumps({
            'perfil': 'peixes_marinhos', 'pipeline': 'run_pipeline_ocean.py'}))
        rng = np.random.default_rng(42)
        features = np.column_stack([rng.uniform(18, 25, 100), rng.uniform(30, 40, 100),
                                    rng.uniform(-1, 2, 100), rng.uniform(-1000, -1, 100)]).astype('float32')
        forest = RandomForestClassifier(n_estimators=9, random_state=42).fit(features, np.arange(100) % 2)
        predictors = ['sst', 'sss', 'chl_log10', 'profundidade']
        ranges = {k: [float(features[:, i].min()), float(features[:, i].max())] for i, k in enumerate(predictors)}
        joblib.dump({'modelo': forest, 'preditores': predictors, 'faixa_treino': ranges}, folder / 'rf_Mugil_liza_marinho.joblib')
        evaluation = {'especie': 'Mugil_liza', 'n_presencas': 50, 'n_pseudo': 50,
                      'balanceamento': {'proporcao': '1:1'}, 'faixa_treino': ranges,
                      'classes_treino': {'0': 35, '1': 35}, 'classes_teste': {'0': 15, '1': 15}}
        (folder / 'rf_Mugil_liza_marinho_eval.json').write_text(json.dumps(evaluation))
        config = root / 'models.csv'
        with config.open('w', newline='') as stream:
            writer = csv.writer(stream)
            writer.writerow(['species', 'species_id', 'profile', 'model_dir'])
            writer.writerow(['Mugil liza', 'mugil_liza', 'peixes_marinhos', str(folder)])
        return inputs, config, forest

    def prepare(self, inputs, convention='negative-ocean'):
        return prepare_layers(inputs, [-40, -11, -38, -9], 1., convention)

    def test_daily_transforms_exact_predictions_names_mask_and_resume(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inputs, config, forest = self.fixture(root)
            day, dataset, provenance = self.prepare(inputs)
            self.assertEqual(day, '2026-10-12')
            self.assertEqual(float(dataset.chl_log10[1, 1]), 1.)
            self.assertTrue(np.isnan(dataset.chl_log10[2, 2]))
            entry = load_models(config)[0]
            out = root / 'shadow'
            result = project_model(entry, dataset, provenance, out)
            self.assertEqual(result['status'], 'complete')
            final = out / day / 'mugil_liza'
            with rasterio.open(final / f'mugil_liza_rf_{day}_mean.tif') as raster:
                values = raster.read(1, masked=True)
                self.assertEqual(values.count(), 7)
                self.assertTrue(values.mask[2, 0])  # land, north-up flip
                self.assertTrue(values.mask[0, 2])  # zero chlorophyll
                expected = forest.predict_proba(np.array([[20, 35, 1, -100]], dtype='float32'))[0, 1]
                self.assertAlmostEqual(float(values[1, 1]), expected, places=6)
                self.assertEqual(raster.crs.to_epsg(), 4326)
            self.assertTrue((final / f'mugil_liza_rf_{day}_sd.tif').exists())
            self.assertTrue((final / f'mugil_liza_rf_{day}_extrapolacao.tif').exists())
            self.assertTrue(project_model(entry, dataset, provenance, out)['reused'])
            changed = dict(provenance, resolution=.5)
            with self.assertRaisesRegex(ValueError, 'mudaram'):
                project_model(entry, dataset, changed, out)
            project_model(entry, dataset, changed, out, existing='overwrite')
            self.assertEqual(len(list((out / '_backups').glob('*/*/*/complete.json'))), 1)
            (final / f'mugil_liza_rf_{day}_mean.tif').write_bytes(b'broken')
            with self.assertRaisesRegex(ValueError, 'corrompida'):
                project_model(entry, dataset, changed, out)

    def test_units_date_manifest_and_depth_convention(self):
        with tempfile.TemporaryDirectory() as tmp:
            inputs, _, _ = self.fixture(Path(tmp))
            depth = inputs / 'depth.nc'
            with xr.open_dataset(depth) as ds:
                changed = ds.load()
            changed['depth'] = -changed.depth
            changed.to_netcdf(depth)
            _, dataset, _ = self.prepare(inputs, 'positive-down')
            self.assertEqual(float(dataset.profundidade[1, 1]), -100.)
            path = inputs / 'thetao.nc'
            with xr.open_dataset(path) as ds:
                wrong = ds.load()
            wrong.thetao.attrs['units'] = 'kelvin'
            wrong.to_netcdf(path)
            with self.assertRaisesRegex(ValueError, 'Unidade'):
                self.prepare(inputs)
            wrong.thetao.attrs['units'] = 'degrees_C'
            wrong = wrong.expand_dims(time=[np.datetime64('2026-10-11')])
            wrong.to_netcdf(path)
            with self.assertRaisesRegex(ValueError, 'data'):
                self.prepare(inputs)
            manifest = json.loads((inputs / 'manifest.json').read_text())
            manifest['files']['thetao'] = '../outside.nc'
            (inputs / 'manifest.json').write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, 'inválido'):
                self.prepare(inputs)

    def test_cli_dry_run_and_batch_exit_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inputs, config, _ = self.fixture(root)
            out = root / 'shadow'
            args = ['--models', str(config), '--predictors', str(inputs), '--outdir', str(out),
                    '--bbox', '-40', '-11', '-38', '-9', '--resolucao', '1',
                    '--depth-convention', 'negative-ocean']
            self.assertEqual(main(args + ['--dry_run']), 0)
            self.assertFalse(out.exists())
            self.assertEqual(main(args), 0)
            summary = json.loads((out / '2026-10-12' / 'run_summary.json').read_text())
            self.assertEqual(summary['records'][0]['status'], 'complete')
            (out / '2026-10-12' / 'mugil_liza' / 'complete.json').unlink()
            self.assertEqual(main(args), 1)
            self.assertTrue((out / '2026-10-12' / 'mugil_liza').exists())

    def test_profile_and_model_balance_are_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _, config, _ = self.fixture(root)
            evaluation = root / 'model_run/modelo_rf_marinho/rf_Mugil_liza_marinho_eval.json'
            bad = json.loads(evaluation.read_text())
            bad['n_pseudo'] = 49
            evaluation.write_text(json.dumps(bad))
            with self.assertRaisesRegex(ValueError, '1:1'):
                load_models(config)

    def test_native_static_bathymetry_singleton_band(self):
        with tempfile.TemporaryDirectory() as tmp:
            inputs, _, _ = self.fixture(Path(tmp))
            depth = inputs / 'depth.nc'
            with xr.open_dataset(depth) as source:
                dataset = source.load().rename({'latitude': 'y', 'longitude': 'x',
                                                'depth': '__xarray_dataarray_variable__'})
            dataset = dataset.expand_dims(band=[1])
            dataset.to_netcdf(depth)
            _, layers, _ = self.prepare(inputs)
            self.assertEqual(layers.profundidade.shape, (3, 3))
            self.assertEqual(float(layers.profundidade[1, 1]), -100.)


if __name__ == '__main__':
    unittest.main()
