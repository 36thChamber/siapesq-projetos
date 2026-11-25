"""Local draft component only. No top-level imports of deployed code or execution.
Pending confirmed remote paths, model and Python-versus-R panel contract.
Install returned class as runner.MarineLayers, never fall back to original build.
"""
def strict_cached_class(marine):
    import json
    import numpy as np
    import xarray as xr
    from dataclasses import asdict

    def require(condition, message):
        if not condition:
            raise RuntimeError('OFFLINE CACHE: ' + message)

    class StrictCachedLayers(marine.MarineLayers):
        def _blocked(self, *args, **kwargs):
            raise RuntimeError('OFFLINE CACHE: generation/download path disabled')
        ensure_cmems = _blocked
        observed = _blocked
        catalog_rows = _blocked
        cmip6_means = _blocked

        def build(self, scenario):
            require(self.window in ('2015-2024', '2025-2025'), 'unexpected time window')
            group = 'anual' if self.window == '2015-2024' else 'mensal'
            allowed = [asdict(s) for s in marine.scenarios(self.window, [group])]
            require(asdict(scenario) in allowed, 'unexpected scenario')
            require(self.bbox == (-90., -60., 55., 40.) and self.resolution == .1,
                    'unexpected grid configuration')
            path = self.cache / (scenario.name + '.nc')
            meta = path.with_suffix('.json')
            require(path.is_file() and meta.is_file(), 'scenario layer or metadata absent')
            saved = json.loads(meta.read_text())
            require(saved.get('scenario') == asdict(scenario), 'scenario metadata differs')
            require(saved.get('settings') == json.loads(json.dumps(self.settings)),
                    'settings differ')
            require(saved.get('sha256') == marine.sha(path), 'scenario layer hash differs')
            sources = [self.bathymetry] + [self.cmems_cache / f'{k}_{self.window}.nc'
                                          for k in ('phy', 'chl')]
            require(all(p.is_file() for p in sources), 'source cache/bathymetry absent')
            identity = [(str(p), p.stat().st_dev, p.stat().st_ino, p.stat().st_size,
                         p.stat().st_mtime_ns) for p in sources]
            if getattr(self, '_verified_source_identity', None) != identity:
                self._verified_depth_hash = marine.sha(self.bathymetry)
                hashes = {}
                for kind, variables in [('phy', ('thetao', 'so')), ('chl', ('CHL',))]:
                    source = self.cmems_cache / f'{kind}_{self.window}.nc'
                    hashes[kind] = marine.sha(source)
                    with xr.open_dataset(source) as ds:
                        marine.check_months(ds.time.values, self.window)
                        require(all(v in ds for v in variables), f'{kind} variables missing')
                self._verified_source_hashes = hashes
                self._verified_source_identity = identity
            require(saved.get('bathymetry_sha256') == self._verified_depth_hash,
                    'bathymetry hash differs')
            require(saved.get('cmems_sha256') == self._verified_source_hashes,
                    'CMEMS source hashes differ')
            with xr.open_dataset(path) as ds:
                require(set(ds.data_vars) == set(marine.PREDICTORS), 'layer variables differ')
                for coord, expected in [('lat', self.lat.values), ('lon', self.lon.values)]:
                    actual = ds[coord].values
                    require(actual.shape == expected.shape and
                            np.allclose(actual, expected, rtol=0, atol=1e-8),
                            f'{coord} grid differs')
                depth = ds.profundidade.transpose('lat', 'lon').values
                ocean = np.isfinite(depth) & (depth < 0)
                valid = ocean.copy()
                for v in marine.PREDICTORS:
                    field = ds[v].transpose('lat', 'lon').values
                    require(not np.isfinite(field[~ocean]).any(), f'{v} finite on land')
                    valid &= np.isfinite(field)
                require(valid.any(), 'no complete ocean cells')
            return path, saved
    return StrictCachedLayers
