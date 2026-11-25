"""Assinatura da grade, dos pixels e das máscaras independente da compactação TIFF."""
import hashlib
import numpy as np
import rasterio
from rasterio.windows import Window

def assinatura(f):
    with rasterio.open(f) as ds:
        h=hashlib.sha256();m=hashlib.sha256()
        for band in ds.indexes:
            for y in range(0,ds.height,128):
                win=Window(0,y,ds.width,min(128,ds.height-y))
                values=ds.read(band,window=win)
                if np.issubdtype(values.dtype,np.floating):
                    values[np.isnan(values)]=np.nan
                    values[values==0]=0
                h.update(values.tobytes())
                m.update(ds.read_masks(band,window=win).tobytes())
        return dict(shape=[ds.width,ds.height,ds.count],dtype=list(ds.dtypes),crs=ds.crs.to_epsg(),
                    transform=list(ds.transform),nodata=[str(x) for x in ds.nodatavals],pixels=h.hexdigest(),masks=m.hexdigest())
