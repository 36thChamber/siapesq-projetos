"""Mede a abertura e a leitura de uma amostra em dois conjuntos públicos do Copernicus Marine."""
import argparse
import os
import time

import copernicusmarine as cm


DATASETS = [('cmems_mod_glo_phy_my_0.083deg_P1D-m', ['thetao', 'so']), ('cmems_obs-oc_glo_bgc-plankton_my_l4-gapfree-multi-4km_P1D', ['CHL'])]

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--servico", choices=("arco-geo-series", "arco-time-series"), default="arco-geo-series")
parser.add_argument("--chunk-zero", action="store_true")
args = parser.parse_args()
for dataset_id, variables in DATASETS:
    options = {}
    if args.chunk_zero:
        options["chunk_size_limit"] = 0
    if "thetao" in variables:
        options.update(minimum_depth=0.49, maximum_depth=1)
    start = time.monotonic()
    with cm.open_dataset(
        dataset_id=dataset_id, variables=variables, service=args.servico,
        username=os.environ["CMEMS_USERNAME"], password=os.environ["CMEMS_PASSWORD"],
        minimum_longitude=-90, maximum_longitude=55, minimum_latitude=-60, maximum_latitude=40,
        **options,
    ) as dataset:
        print(dataset_id, dict(dataset.sizes), {
            var: dataset[var].encoding.get("chunks", dataset[var].encoding.get("preferred_chunks"))
            for var in variables
        }, dataset.time.values[0], dataset.time.values[-1], time.monotonic() - start, flush=True)
        dataset.sel(time="2005-01-02", longitude=slice(-50, -49), latitude=slice(-35, -34)).load()
        print("Segundos desde a abertura", time.monotonic() - start, flush=True)
