import os
import argparse
import pandas as pd
import xarray as xr
import cdsapi
import warnings
from concurrent.futures import ThreadPoolExecutor, as_completed

warnings.filterwarnings("ignore")

parser = argparse.ArgumentParser(description="Pipeline climatico com checkpoint e auto-limpeza.")
parser.add_argument("arquivo_csv", type=str)
parser.add_argument(
    "especie",
    type=str,
    choices=["Canola", "Soja_Milho", "Arroz", "Cafe", "Maca"]
)
parser.add_argument(
    "--workers",
    type=int,
    default=3,
    help="Numero de downloads paralelos"
)

args = parser.parse_args()

CSV_BRUTO = args.arquivo_csv
CSV_FINAL = CSV_BRUTO.replace(".csv", "_clima_global_safras.csv")
ESPECIE = args.especie
N_WORKERS = args.workers

CONFIG_ESPECIES = {
    "Soja_Milho": {
        "America_Sul":   {"meses": [10, 11, 12, 1, 2]},
        "America_Norte": {"meses": [5, 6, 7, 8, 9]},
        "Europa":        {"meses": [4, 5, 6, 7, 8]},
        "Africa":        {"meses": [11, 12, 1, 2, 3]},
        "Asia_Oceania":  {"meses": [5, 6, 7, 8, 9]},
    },

    "Canola": {
        "America_Sul":   {"meses": [4, 5, 6, 7, 8]},
        "America_Norte": {"meses": [9, 10, 11, 12, 1]},
        "Europa":        {"meses": [8, 9, 10, 11, 12]},
        "Africa":        {"meses": [5, 6, 7, 8, 9]},
        "Asia_Oceania":  {"meses": [9, 10, 11, 12, 1]},
    },

    "Arroz": {
        "America_Sul":   {"meses": [9, 10, 11, 12, 1]},
        "America_Norte": {"meses": [4, 5, 6, 7, 8]},
        "Europa":        {"meses": [5, 6, 7, 8, 9]},
        "Africa":        {"meses": [6, 7, 8, 9, 10]},
        "Asia_Oceania":  {"meses": [6, 7, 8, 9, 10]},
    },

    "Cafe": {
        "America_Sul":   {"meses": [9, 10, 11, 12, 1, 2, 3]},
        "America_Norte": {"meses": [10, 11, 12, 1, 2, 3]},
        "Europa":        {"meses": [4, 5, 6, 7, 8]},
        "Africa":        {"meses": [9, 10, 11, 12, 1, 2]},
        "Asia_Oceania":  {"meses": [10, 11, 12, 1, 2, 3]},
    },
    "Maca": {
        "America_Sul":   {"meses": [1, 2, 3, 4, 5]},
        "America_Norte": {"meses": [8, 9, 10, 11]},
        "Europa":        {"meses": [8, 9, 10, 11]},
        "Africa":        {"meses": [1, 2, 3, 4, 5, 8, 9]},
        "Asia_Oceania":  {"meses": [2, 3, 4, 5, 8, 9, 10, 11]},
    },
}

VARIAVEIS_API = [
    "2m_temperature",
    "total_evaporation",
    "potential_evaporation"
]

DIR_BRUTOS = "Variaveis Safra"

os.makedirs(DIR_BRUTOS, exist_ok=True)


def classificar_continente(lat, lon):
    if lat > 15 and lon < -45:
        return "America_Norte"
    elif lat <= 15 and lon < -30:
        return "America_Sul"
    elif lat > 35 and -25 <= lon <= 45:
        return "Europa"
    elif lat <= 35 and -20 <= lon <= 50:
        return "Africa"
    elif lon > 50:
        return "Asia_Oceania"
    else:
        return "America_Sul"


def bbox_para_regiao(df_regiao, margem=2.0):
    lat_max = min(90.0, df_regiao["decimalLatitude"].max() + margem)
    lat_min = max(-90.0, df_regiao["decimalLatitude"].min() - margem)

    lon_max = min(180.0, df_regiao["decimalLongitude"].max() + margem)
    lon_min = max(-180.0, df_regiao["decimalLongitude"].min() - margem)

    return [lat_max, lon_min, lat_min, lon_max]


def arquivo_valido(path):
    if not os.path.exists(path):
        return False
    if os.path.getsize(path) == 0:
        return False
    try:
        with xr.open_dataset(path):
            pass
        return True
    except Exception:
        os.remove(path)
        print(f"Arquivo corrompido removido: {os.path.basename(path)}")
        return False

# OTIMIZAÇÃO 1: A API baixa todas as variáveis num único arquivo NC.
def baixar_arquivo(client, ano_str, vars_list, bbox, regiao, meses):
    meses_str = "-".join(f"{m:02d}" for m in sorted(set(meses)))

    path = os.path.join(
        DIR_BRUTOS,
        f"raw_{regiao}_{ano_str}_todas_vars_{meses_str}.nc"
    )

    if arquivo_valido(path):
        return path

    try:
        client.retrieve(
            "reanalysis-era5-land",
            {
                "variable": vars_list, # Lista enviada inteira
                "year": ano_str,
                "month": [f"{m:02d}" for m in sorted(set(meses))],
                "day": [f"{d:02d}" for d in range(1, 32)],
                "time": ["00:00", "06:00", "12:00", "18:00"],
                "data_format": "netcdf",
                "download_format": "unarchived",
                "area": bbox,
            },
            path,
        )
        return path

    except Exception as e:
        print(f"Erro ao baixar de {ano_str}: {e}")
        return None


def remover_arquivos(lista):
    for arq in lista:
        try:
            os.remove(arq)
        except Exception:
            pass


if os.path.exists(CSV_FINAL):
    print(f"Retomando progresso de '{CSV_FINAL}'...")
    df = pd.read_csv(CSV_FINAL)

else:
    print(f"Lendo arquivo bruto '{CSV_BRUTO}'...")
    df = pd.read_csv(CSV_BRUTO)

    for col in [
        "t2m_safra",
        "et_acumulada_safra",
        "pet_acumulada_safra",
        "t_minima_safra",
        "dias_geada_safra",
        "Continente"
    ]:
        if col not in df.columns:
            df[col] = pd.NA

    df["Continente"] = df.apply(
        lambda row: classificar_continente(
            row["decimalLatitude"],
            row["decimalLongitude"]
        ),
        axis=1,
    )

client = cdsapi.Client(quiet=True)

for regiao in df["Continente"].dropna().unique():

    conf_regiao = CONFIG_ESPECIES[ESPECIE].get(regiao)

    if not conf_regiao:
        continue

    MESES_SAFRA = conf_regiao["meses"]
    cruza_ano = MESES_SAFRA[0] > MESES_SAFRA[-1]
    df_regiao = df[df["Continente"] == regiao]

    if df_regiao.empty:
        continue

    bbox = bbox_para_regiao(df_regiao)

    anos_regiao = sorted(
        df_regiao["year"].dropna().unique().astype(int)
    )

    print(
        f"\n{regiao.upper()} | "
        f"Safra: {MESES_SAFRA} | "
        f"Pontos: {len(df_regiao)}"
    )

    for ano in anos_regiao:

        idx_grupo = df[
            (df["year"] == ano) &
            (df["Continente"] == regiao)
        ].index

        if not pd.isna(df.loc[idx_grupo[0], "t2m_safra"]):
            print(f"[{ano}] Ja processado. Pulando.")
            continue

        if cruza_ano:
            meses_ano_atual = [m for m in MESES_SAFRA if m >= MESES_SAFRA[0]]
            meses_ano_seguinte = [m for m in MESES_SAFRA if m < MESES_SAFRA[0]]

            # OTIMIZAÇÃO 1: Redução drástica da quantidade de "tarefas"
            tarefas = [
                (str(ano), VARIAVEIS_API, meses_ano_atual),
                (str(ano + 1), VARIAVEIS_API, meses_ano_seguinte)
            ]
        else:
            tarefas = [
                (str(ano), VARIAVEIS_API, MESES_SAFRA)
            ]

        print(
            f"[{ano}] Baixando "
            f"{len(tarefas)} arquivo(s) consolidados "
            f"com {N_WORKERS} workers..."
        )

        arquivos = []

        with ThreadPoolExecutor(max_workers=N_WORKERS) as ex:
            futures = {
                ex.submit(
                    baixar_arquivo,
                    client,
                    a,
                    v,
                    bbox,
                    regiao,
                    m
                ): a
                for a, v, m in tarefas
            }

            for future in as_completed(futures):
                resultado = future.result()
                if resultado:
                    arquivos.append(resultado)

        if len(arquivos) < len(tarefas):
            print(f"[{ano}] Download incompleto.")
            continue

        print(f"[{ano}] Calculando variaveis agronomicas...")

        try:
            ds = xr.open_mfdataset(
                arquivos,
                combine="by_coords"
            )

            ds = ds.assign_coords(
                longitude=(((ds.longitude + 180) % 360) - 180)
            )

            if "valid_time" in ds.variables:
                ds = ds.rename({"valid_time": "time"})

            if "expver" in ds.dims:
                ds = ds.mean(dim="expver", skipna=True)

            ds = ds.where(
                ds["time"].dt.month.isin(MESES_SAFRA),
                drop=True
            )

            t2m_mean = ds["t2m"].mean(dim="time")
            et_sum = ds["e"].sum(dim="time")
            pet_sum = ds["pev"].sum(dim="time")
            tmin_diaria = ds["t2m"].resample(time="1D").min()
            tmin_media = tmin_diaria.mean(dim="time")
            geada = (tmin_diaria < 276.15).sum(dim="time")

            # OTIMIZAÇÃO 2: Substituição do laço for i in idx_grupo: por indexação vetorizada
            lats = xr.DataArray(df.loc[idx_grupo, "decimalLatitude"], dims="pontos")
            lons = xr.DataArray(df.loc[idx_grupo, "decimalLongitude"], dims="pontos")

            try:
                # O Xarray extrai todos os pontos em uma única operação paralela
                df.loc[idx_grupo, "t2m_safra"] = t2m_mean.sel(latitude=lats, longitude=lons, method="nearest").values
                df.loc[idx_grupo, "et_acumulada_safra"] = et_sum.sel(latitude=lats, longitude=lons, method="nearest").values
                df.loc[idx_grupo, "pet_acumulada_safra"] = pet_sum.sel(latitude=lats, longitude=lons, method="nearest").values
                df.loc[idx_grupo, "t_minima_safra"] = tmin_media.sel(latitude=lats, longitude=lons, method="nearest").values
                df.loc[idx_grupo, "dias_geada_safra"] = geada.sel(latitude=lats, longitude=lons, method="nearest").values
            except Exception as ex_extracao:
                print(f"Erro na extração dos pontos: {ex_extracao}")

            ds.close()

            print(f"[{ano}] Extraido com sucesso.")

        except Exception as e:
            print(f"[{ano}] Erro no processamento: {e}")
            continue
        finally:
            remover_arquivos(arquivos)

        df.to_csv(CSV_FINAL, index=False)
        print(f"[{ano}] Progresso salvo.")

print("\nRealizando limpeza final das linhas não preenchidas...")

colunas_climaticas = [
    "t2m_safra",
    "et_acumulada_safra",
    "pet_acumulada_safra",
    "t_minima_safra",
    "dias_geada_safra"
]

# Remove qualquer linha que tenha valor vazio (NaN) em alguma destas colunas
df.dropna(subset=colunas_climaticas, inplace=True)

# Salva o arquivo CSV definitivo já limpo
df.to_csv(CSV_FINAL, index=False)

print("Pipeline concluido.")
print(f"Arquivo limpo e salvo em: {os.path.abspath(CSV_FINAL)}")