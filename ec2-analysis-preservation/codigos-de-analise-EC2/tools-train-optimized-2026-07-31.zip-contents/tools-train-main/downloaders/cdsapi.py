import os
import pandas as pd
import xarray as xr
import cdsapi


# ===============================
# VALIDAÇÃO DE COORDENADAS
# ===============================
def is_valid_coord(lat, lon):
    return -90 <= lat <= 90 and -180 <= lon <= 180


# ===============================
# DOWNLOAD
# ===============================
def download(year, month, day, bbox, target, max_retries=5):
    try:
        dataset = "reanalysis-era5-land"

        request = {
            "variable": [
                "2m_temperature",
                "total_evaporation",
                "total_precipitation"
            ],
            "year": str(year),
            "month": f"{int(month):02d}",
            "day": [f"{int(day):02d}"],
            "time": ["12:00"],
            "data_format": "grib",
            "download_format": "unarchived",
            "area": bbox
        }

        client = cdsapi.Client(progress=False, quiet=True, retry_max=max_retries)
        client.retrieve(dataset, request, target=target)

    except Exception as e:
        print(f"[ERRO DOWNLOAD {year}-{month}-{day}] {e}")
        return False

    return True


# ===============================
# CRIA HASH
# ===============================
def create_data_hash(df):
    data_hash = {}
    total = len(df)

    for idx, row in df.iterrows():

        if idx % 100 == 0:
            faltam = total - idx
            print(f"[HASH] Linha {idx}/{total} | Faltam: {faltam}")

        if pd.notnull(row.get("t2m")) and pd.notnull(row.get("tp")) and pd.notnull(row.get("e")):
            continue

        lat = float(row["decimalLatitude"])
        lon = float(row["decimalLongitude"])

        if not is_valid_coord(lat, lon):
            df.at[idx, "invalid"] = True
            continue

        year = int(row["year"])
        month = int(row["month"])
        day = int(row["day"])

        key = f"{year}_{month:02d}_{day:02d}"

        data_hash.setdefault(key, []).append((idx, lon, lat))

    return data_hash


# ===============================
# DOWNLOADS
# ===============================
def process_downloads(data_hash, data_dir, max_retries):
    print("Baixando apenas dados faltantes...")
    os.makedirs(data_dir, exist_ok=True)

    total_keys = len(data_hash)
    count = 0

    for key, coords in data_hash.items():
        count += 1
        faltam = total_keys - count

        indices = [c[0] for c in coords]
        lons = [c[1] for c in coords]
        lats = [c[2] for c in coords]

        year, month, day = key.split("_")
        target = f"{data_dir}/variables_{key}.grib"

        buffer = 0.25

        north = min(max(lats) + buffer, 90)
        south = max(min(lats) - buffer, -90)
        west = max(min(lons) - buffer, -180)
        east = min(max(lons) + buffer, 180)

        if south >= north or west >= east:
            print(f"[{key}] BBOX inválido, ignorando")
            continue

        bbox = [north, west, south, east]

        print(f"[{key}] Linhas: {indices[:5]}... ({len(indices)}) | BBOX: {bbox} | Faltam keys: {faltam}")

        if not os.path.exists(target):
            print(f"[{key}] Downloading...")
            ok = download(year, month, day, bbox, target, max_retries)

            if not ok:
                print(f"[{key}] Falhou, ignorando")
        else:
            print(f"[{key}] Already downloaded.")


# ===============================
# PROCESSAMENTO
# ===============================
def process_data(df, data_dir):
    print("Processando dados...")

    dataset_cache = {}
    total = len(df)

    for index, row in df.iterrows():

        if index % 100 == 0:
            faltam = total - index
            print(f"[PROCESS] Linha {index}/{total} | Faltam: {faltam}")

        if row.get("invalid") is True:
            continue

        if pd.notnull(row.get("t2m")) and pd.notnull(row.get("tp")) and pd.notnull(row.get("e")):
            continue

        lat = float(row["decimalLatitude"])
        lon = float(row["decimalLongitude"])

        if not is_valid_coord(lat, lon):
            df.at[index, "invalid"] = True
            continue

        year = int(row["year"])
        month = int(row["month"])
        day = int(row["day"])

        key = f"{year}_{month:02d}_{day:02d}"
        target = f"{data_dir}/variables_{key}.grib"

        if not os.path.exists(target):
            df.at[index, "invalid"] = True
            continue

        try:
            if key not in dataset_cache:
                print(f"[CACHE] Abrindo dataset: {key}")
                dataset_cache[key] = xr.open_dataset(
                    target,
                    engine="cfgrib",
                    decode_timedelta=False,
                    backend_kwargs={"indexpath": ""}
                )

            ds = dataset_cache[key]

            ok = True

            for var in ["t2m", "e", "tp"]:
                if var not in ds:
                    ok = False
                    break

                valor = ds[var].sel(
                    latitude=lat,
                    longitude=lon,
                    method="nearest"
                ).values

                if pd.isnull(valor):
                    ok = False
                    break

                df.at[index, var] = float(valor)

            if not ok:
                df.at[index, "invalid"] = True

        except Exception as e:
            print(f"Erro em {key} (linha {index}): {e}")
            df.at[index, "invalid"] = True

    for ds in dataset_cache.values():
        ds.close()

    return df


# ===============================
# MAIN
# ===============================
def run_cmd(args):
    csv = args.csv
    data_dir = args.data_dir
    max_retries = args.max_retries

    df = pd.read_csv(csv)

    print("Analisando CSV...")

    for col in ["t2m", "e", "tp"]:
        if col not in df.columns:
            print(f"Criando coluna {col}")
            df[col] = pd.NA

    df["invalid"] = False

    data_hash = create_data_hash(df)

    if len(data_hash) == 0:
        print("Nada para baixar.")
    else:
        process_downloads(data_hash, data_dir, max_retries)

    df = process_data(df, data_dir)

    print("Removendo linhas inválidas...")
    df = df[(df["invalid"] == False)]

    df = df.dropna(subset=["t2m", "e", "tp"])

    df = df.drop(columns=["invalid"])

    print(f"Linhas finais: {len(df)}")

    out_file = f"out_{os.path.basename(csv)}"
    df.to_csv(out_file, index=False)

    print(f"Finalizado -> {out_file}")