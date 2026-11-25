#!/usr/bin/env python3
"""Explicit S3 keys -> isolated, lossless COGs. No source writes; resumable manifest."""
import argparse
import hashlib
import json
import tempfile
from pathlib import Path

import boto3
import numpy as np
import rasterio
from rasterio.shutil import copy as raster_copy
from rio_cogeo.cogeo import cog_validate


def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--keys', required=True, help='JSON array of exact source keys')
    p.add_argument('--bucket', required=True)
    p.add_argument('--prefix', required=True)
    p.add_argument('--output', required=True, type=Path)
    p.add_argument('--upload', action='store_true', help='Publish validated copies; never overwrite existing keys')
    args = p.parse_args()
    if not args.prefix.startswith('siapesq-cog-clone/') or not args.prefix.endswith('/') or '..' in args.prefix.split('/'):
        p.error('prefix must be isolated under siapesq-cog-clone/ and end with /')
    keys = json.loads(Path(args.keys).read_text())
    if not isinstance(keys, list) or not keys or len(set(keys)) != len(keys):
        p.error('keys must be a non-empty unique list')
    if any(not isinstance(k, str) or not k.lower().endswith(('.tif', '.tiff')) or k.startswith(args.prefix) or '..' in k.split('/') for k in keys):
        p.error('invalid source key')
    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'schema': 1, 'status': 'incomplete', 'files': []}
    s3 = boto3.client('s3')
    for key in keys:
        src_head = s3.head_object(Bucket=args.bucket, Key=key)
        target = args.prefix + key
        prior = next((e for e in manifest['files'] if e['source_key'] == key), None)
        if prior and args.upload and prior.get('etag'):
            dst_head = s3.head_object(Bucket=args.bucket, Key=target)
            if prior['source_etag'] != src_head['ETag'] or prior['etag'] != dst_head['ETag']:
                raise RuntimeError('Manifest/object drift: use a new version prefix')
            continue
        with tempfile.TemporaryDirectory() as temp:
            src, dst = Path(temp) / 'source.tif', Path(temp) / 'cog.tif'
            s3.download_file(args.bucket, key, str(src))
            with rasterio.open(src) as dataset:
                if dataset.crs is None or dataset.crs.to_epsg() is None or dataset.transform.b or dataset.transform.d:
                    raise RuntimeError('Only EPSG north-up grids supported by client')
            raster_copy(src, dst, driver='COG', COMPRESS='DEFLATE', BLOCKSIZE=512,
                        PREDICTOR='YES', RESAMPLING='NEAREST', OVERVIEWS='IGNORE_EXISTING')
            valid, errors, warnings = cog_validate(dst, strict=True)
            if not valid:
                raise RuntimeError(str(errors + warnings))
            pixels = 0
            with rasterio.open(src) as a, rasterio.open(dst) as b:
                if (a.crs, a.transform, a.shape, a.count, a.dtypes) != (b.crs, b.transform, b.shape, b.count, b.dtypes):
                    raise RuntimeError('Spatial metadata changed')
                if not all(x == y or (x is not None and y is not None and np.isnan(x) and np.isnan(y)) for x, y in zip(a.nodatavals, b.nodatavals)):
                    raise RuntimeError('NoData changed')
                for _, window in b.block_windows(1):
                    av, bv = a.read(window=window), b.read(window=window)
                    if av.tobytes() != bv.tobytes() or not np.array_equal(a.read_masks(window=window), b.read_masks(window=window)):
                        raise RuntimeError('Pixel/mask mismatch')
                    pixels += av.size
                metadata = {'width': b.width, 'height': b.height, 'crs': str(b.crs), 'overviews': b.overviews(1)}
            # Guard against a source replacement during download/conversion.
            if s3.head_object(Bucket=args.bucket, Key=key)['ETag'] != src_head['ETag']:
                raise RuntimeError('Source changed during conversion')
            entry = dict(source_bucket=args.bucket, source_key=key, source_etag=src_head['ETag'],
                         source_bytes=src_head['ContentLength'], source_sha256=sha256(src),
                         bucket=args.bucket, key=target, bytes=dst.stat().st_size, sha256=sha256(dst),
                         cog_valid=True, pixels_bitwise_equal=True, masks_equal=True, pixels_compared=pixels, metadata=metadata)
            if args.upload:
                # Conditional Put prevents accidental replacement even on a concurrent run.
                with dst.open('rb') as data:
                    result = s3.put_object(Bucket=args.bucket, Key=target, Body=data, ContentType='image/tiff', IfNoneMatch='*')
                entry['etag'] = result['ETag']
                remote = s3.get_object(Bucket=args.bucket, Key=target, Range='bytes=0-16383')
                body = remote['Body'].read()
                if remote['ResponseMetadata']['HTTPStatusCode'] != 206 or body != dst.read_bytes()[:16384]:
                    raise RuntimeError('Remote range read mismatch')
                s3.download_file(args.bucket, target, str(Path(temp) / 'readback.tif'))
                if sha256(Path(temp) / 'readback.tif') != entry['sha256']:
                    raise RuntimeError('Published SHA256 mismatch')
                entry['range_read_verified'] = True
            else:
                (args.output / (hashlib.sha256(key.encode()).hexdigest()[:16] + '.tif')).write_bytes(dst.read_bytes())
            manifest['files'] = [e for e in manifest['files'] if e['source_key'] != key] + [entry]
            manifest['status'] = 'incomplete'
            temporary = manifest_path.with_suffix('.tmp')
            temporary.write_text(json.dumps(manifest, indent=2) + '\n')
            temporary.replace(manifest_path)
            print(json.dumps({'key': key, 'pixels': pixels, 'bytes': entry['bytes'], 'uploaded': args.upload}), flush=True)
    manifest['status'] = 'validated' if args.upload else 'local-only'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__':
    main()
