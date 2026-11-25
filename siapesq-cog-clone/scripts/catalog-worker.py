#!/usr/bin/env python3
"""Credential-free EC2 worker; capabilities arrive as short-lived presigned URLs.

The input bundle is private and must never be committed. Reports contain no URLs.
Objects are conditional writes; source objects are never modified.
"""
import concurrent.futures
import hashlib
import json
import os
import tempfile
import time
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.shutil import copy as raster_copy
from rio_cogeo.cogeo import cog_validate


def digest(path):
    with path.open('rb') as data:
        return hashlib.file_digest(data, 'sha256').hexdigest()


def download(session, url, path, headers=None):
    with session.get(url, headers=headers or {}, stream=True, timeout=(20, 180)) as response:
        if response.status_code != 200:
            raise RuntimeError(f'download HTTP {response.status_code}')
        with path.open('wb') as target:
            for block in response.iter_content(1024 * 1024):
                target.write(block)


def convert(item):
    session = requests.Session()
    with tempfile.TemporaryDirectory(prefix='cog-') as directory:
        source, target, readback = [Path(directory) / name for name in ('source.tif', 'cog.tif', 'readback.tif')]
        download(session, item['get_source'], source, {'If-Match': item['etag']})
        if source.stat().st_size != item['bytes']:
            raise RuntimeError('source size changed')
        with rasterio.Env(GDAL_CACHEMAX=64 * 1024 * 1024, GDAL_NUM_THREADS='1'):
            with rasterio.open(source) as original:
                if original.crs is None or original.crs.to_epsg() is None or original.transform.b or original.transform.d:
                    raise RuntimeError('unsupported CRS or rotated grid')
            raster_copy(source, target, driver='COG', COMPRESS='DEFLATE', BLOCKSIZE=512,
                        PREDICTOR='YES', RESAMPLING='NEAREST', OVERVIEWS='IGNORE_EXISTING', NUM_THREADS='1')
            valid, errors, warnings = cog_validate(target, strict=True, quiet=True)
            if not valid:
                raise RuntimeError('strict COG validation failed: ' + str(errors + warnings))
            pixels = 0
            with rasterio.open(source) as a, rasterio.open(target) as b:
                if (a.crs, a.transform, a.shape, a.count, a.dtypes) != (b.crs, b.transform, b.shape, b.count, b.dtypes):
                    raise RuntimeError('spatial metadata changed')
                if not all(x == y or (x is not None and y is not None and np.isnan(x) and np.isnan(y))
                           for x, y in zip(a.nodatavals, b.nodatavals)):
                    raise RuntimeError('NoData changed')
                for _, window in b.block_windows(1):
                    av, bv = a.read(window=window), b.read(window=window)
                    if av.tobytes() != bv.tobytes() or not np.array_equal(a.read_masks(window=window), b.read_masks(window=window)):
                        raise RuntimeError('pixel or mask mismatch')
                    pixels += av.size
                metadata = {'width': b.width, 'height': b.height, 'crs': str(b.crs), 'overviews': b.overviews(1)}
        guard = session.head(item['head_source'], headers={'If-Match': item['etag']}, timeout=30)
        if guard.status_code != 200 or guard.headers.get('ETag') != item['etag']:
            raise RuntimeError('source changed during conversion')
        entry = dict(source_bucket=item['bucket'], source_key=item['key'], source_etag=item['etag'],
                     source_bytes=item['bytes'], source_sha256=digest(source), bucket=item['bucket'],
                     key=item['target'], bytes=target.stat().st_size, sha256=digest(target), cog_valid=True,
                     pixels_bitwise_equal=True, masks_equal=True, pixels_compared=pixels, metadata=metadata)
        # Existing objects can only be adopted after the same full validation/readback.
        with target.open('rb') as body:
            response = session.put(item['put_target'], data=body,
                                   headers={'If-None-Match': '*', 'Content-Type': 'image/tiff'}, timeout=(20, 180))
        if response.status_code not in (200, 412):
            raise RuntimeError(f'conditional upload HTTP {response.status_code}')
        download(session, item['get_target'], readback)
        if digest(readback) != entry['sha256']:
            raise RuntimeError('published SHA256 mismatch')
        response = session.get(item['get_target'], headers={'Range': 'bytes=0-16383'}, timeout=30)
        with target.open('rb') as body:
            expected = body.read(16384)
        if response.status_code != 206 or response.content != expected:
            raise RuntimeError('published range mismatch')
        entry.update(etag=response.headers['ETag'], range_read_verified=True, readback_sha256_verified=True)
        session.close()
        return entry


def main():
    job = json.loads(Path('job.json').read_text())
    started = time.time()
    report = {'schema': 1, 'status': 'running', 'job_id': job['id'], 'expected': len(job['items']),
              'started_at': started, 'files': [], 'failures': []}
    def checkpoint(final=False):
        report.update(elapsed_seconds=round(time.time() - started, 1), completed=len(report['files']))
        payload = json.dumps(report, separators=(',', ':')).encode()
        Path('report.json').write_bytes(payload)
        response = requests.put(job['put_report'], data=payload, headers={'Content-Type': 'application/json'}, timeout=60)
        if response.status_code != 200:
            raise RuntimeError(f'report HTTP {response.status_code}')
        print(json.dumps({k: report[k] for k in ('status', 'expected', 'completed', 'elapsed_seconds')}
                         | {'failures': len(report['failures'])}), flush=True)
    checkpoint()
    with concurrent.futures.ThreadPoolExecutor(max_workers=job.get('workers', 8)) as pool:
        futures = {pool.submit(convert, item): item['key'] for item in job['items']}
        last_report = time.time()
        for future in concurrent.futures.as_completed(futures):
            try:
                report['files'].append(future.result())
            except Exception as error:
                # URL-bearing HTTP/library errors must never reach reports or console.
                detail = str(error) if isinstance(error, RuntimeError) else type(error).__name__
                report['failures'].append({'source_key': futures[future], 'error': detail.split('http')[0][:300]})
            if len(report['files']) % 25 == 0 or time.time() - last_report >= 30:
                checkpoint()
                last_report = time.time()
    report['files'].sort(key=lambda entry: entry['source_key'])
    report['status'] = 'validated' if len(report['files']) == report['expected'] and not report['failures'] else 'failed'
    checkpoint(True)


if __name__ == '__main__':
    main()
