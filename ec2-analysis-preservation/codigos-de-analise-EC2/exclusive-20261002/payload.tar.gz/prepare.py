"""Reusa as camadas do lote anterior e deriva amplitudes no próprio EC2."""
from pathlib import Path
import importlib.util
import json,os,sys

BASE=Path(__file__).resolve().parent
REPO=BASE/'repo'
OLD=Path('/workspace/common26/scenarios')
CFG=json.loads((BASE/'config.json').read_text())

def link(src,dst):
    if not src.is_file():raise FileNotFoundError(src)
    dst.parent.mkdir(parents=True,exist_ok=True)
    if dst.exists():
        if not os.path.samefile(src,dst):raise RuntimeError('Conflicting cached layer '+str(dst))
    else:os.link(src,dst)

annual=OLD/'anual_2015_2024'
cache=REPO/'env_data/raster_cache/brasil_250m'
for col in ['t2m','e','tp','ndvi']:
    link(annual/(col+'.tif'),cache/(col+'_brasil.tif'))
for col in ['altitude','awc']:
    link(annual/(col+'.tif'),cache/(col+'_brasil_250m.tif'))
link(annual/'ocup_solo_mapbiomas.tif',REPO/'03_environmental_processing/ocup_solo_mapbiomas_brasil_2024_250m.tif')
monthly=REPO/'env_data/raster_cache/mensal'
for scenario in CFG['scenarios']:
    if not scenario.startswith('mensal_'):continue
    month=scenario.split('_')[1]
    for col in ['t2m','e','tp','ndvi']:
        link(OLD/scenario/(col+'.tif'),monthly/(col+'_'+month+'.tif'))
spec=importlib.util.spec_from_file_location('amplitudes',REPO/'03_environmental_processing/gerar_amplitudes_sazonais.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
for col in ['t2m','e','tp','ndvi']:
    target=monthly/(col+'_amp.tif')
    if not target.exists():
        if not module.gerar(col):raise RuntimeError('Amplitude missing '+col)
for scenario in CFG['scenarios']:
    destination=REPO/'predict variables'/scenario
    for col in ['t2m','e','tp','ndvi','altitude','awc','ocup_solo_mapbiomas']:
        link(OLD/scenario/(col+'.tif'),destination/(col+'.tif'))
    for col in ['t2m','e','tp','ndvi']:
        link(monthly/(col+'_amp.tif'),destination/(col+'_amp.tif'))
print('READY: 17 scenarios, existing 7 predictors + 4 seasonal amplitudes',flush=True)
os.chdir(REPO)
sys.path.insert(0,str(REPO/'02_pseudoabsence'))
from resolve_ecoregions import download_resolve
download_resolve()
sys.path.insert(0,str(REPO/'05_utils'))
from filtro_brasil import poligono_brasil
poligono_brasil()
# Cache shared reference data before concurrent acquisition/cleaning.
sys.path.insert(0,str(REPO/'01_data_acquisition'))
from cleaning.reference_data import ReferenceData
from cleaning.config import CleaningConfig
os.chdir(REPO/"01_data_acquisition")
refs=ReferenceData(CleaningConfig())
_ = refs.countries
_ = refs.states
_ = refs.capitals
_ = refs.institutions
print('Shared spatial references prepared.',flush=True)
