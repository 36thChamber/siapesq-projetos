"""Verify the completed rasters and record the actual diagnostics without overriding them."""
from pathlib import Path
import hashlib,json,datetime
import numpy as np
import rasterio
from rasterio.enums import Resampling
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

BASE=Path(__file__).resolve().parent
OUT=BASE/'saida';SLUG='Vireo_chivi_anual_2015_2024'
with rasterio.open('/workspace/tools-train-models-vireo/env_data/predicao_7var_brasil_1km/ocup_solo_mapbiomas.tif') as src:
    domain=src.read(1,masked=True).filled(0)>0
    ref_transform=src.transform
stats={}
for suffix in ['adequabilidade','incerteza','extrapolacao']:
    p=OUT/f'{SLUG}_{suffix}.tif'
    with rasterio.open(p) as src:
        assert src.shape==domain.shape and src.crs.to_epsg()==4326
        assert src.transform.almost_equals(ref_transform)
        a=src.read(1,masked=True)
        valid=~np.ma.getmaskarray(a)&np.isfinite(a.data)
        assert not (valid&~domain).any(), f'Pixels outside domain: {suffix}'
        v=a.data[valid]
        assert v.size>0 and v.min()>=0
        assert v.max()<=(6 if suffix=='extrapolacao' else 1)
        stats[suffix]={'arquivo':p.name,'pixels_validos':int(valid.sum()),'cobertura_dominio':float((valid&domain).sum()/domain.sum()),'min':float(v.min()),'max':float(v.max()),'media':float(v.mean()),'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()}
coer=json.loads((OUT/f'{SLUG}_coerencia.json').read_text())
ext=json.loads((OUT/f'{SLUG}_extrapolacao.json').read_text())
result={'especie':'Vireo chivi','cenario':'anual_2015_2024','grade':[4000,4000],'resolucao_graus':.01,'crs':'EPSG:4326','validacao_arquivos':'OK','coerencia_ecologica':coer['veredito'],'extrapolacao_pct':ext['pct_celulas_com_alguma_extrapolacao'],'mapas':stats,'concluido_em':datetime.datetime.now().astimezone().isoformat()}
(OUT/'resumo_final.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
fig,axes=plt.subplots(1,2,figsize=(12,6),layout='constrained')
for ax,suffix,label,cmap in zip(axes,['adequabilidade','incerteza'],['Adequabilidade ambiental','Desvio entre os 10 modelos'],['viridis','magma']):
    with rasterio.open(OUT/f'{SLUG}_{suffix}.tif') as src:
        arr=src.read(1,out_shape=(1000,1000),masked=True,resampling=Resampling.average)
        bounds=src.bounds
    kwargs={'vmin':0,'vmax':1} if suffix=='adequabilidade' else {'vmin':0}
    im=ax.imshow(arr,extent=[bounds.left,bounds.right,bounds.bottom,bounds.top],cmap=cmap,**kwargs)
    ax.set_title(label);ax.set_xlabel('Longitude');ax.set_ylabel('Latitude');fig.colorbar(im,ax=ax,shrink=.8)
fig.suptitle('Vireo chivi — cenário anual climatológico 2015–2024',fontsize=15)
fig.savefig(OUT/f'{SLUG}_mapas.png',dpi=180)
state=json.loads((BASE/'estado.json').read_text());state.update(prediction_executed=True,status='completed',running_process_ids={},validation=result);(BASE/'estado.json').write_text(json.dumps(state,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
