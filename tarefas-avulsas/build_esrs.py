# Monta e valida um ZIP com os modelos das espécies comuns e exclusivas do RS e ES.
from pathlib import Path
import json, zipfile, os, time

p = Path(os.environ["ESPECIES_DIR"])
work = Path(os.environ["MODELOS_DIR"])
dest = Path(os.environ["ZIP_DESTINO"])
assert not dest.exists()
tmp = dest.with_suffix(".zip.partial")
with zipfile.ZipFile(tmp, "x", allowZip64=True) as z:
    for label, txt in [("comuns-rs-es", "comuns"), ("exclusivas-rs", "somente_RS")]:
        for s in (p / (txt + ".txt")).read_text().strip().splitlines():
            s = s.strip().replace(" ", "_")
            d = p / "predicoes_17" / s / "modelo"
            for f in [d / f"rf_{s}_clima.sdm", d / "predictor_climatologico.csv"]:
                assert f.stat().st_size > 0
                z.write(f, label + "/" + s + "/" + f.name)
    for s in [
        "Chelonia_mydas",
        "Micropogonias_furnieri",
        "Mugil_liza",
        "Pomatomus_saltatrix",
    ]:
        a = [
            x
            for x in json.load(
                open(
                    Path(os.environ["MANIFESTOS_DIR"])
                    / ("modelos-drive-" + s + ".json")
                )
            )
            if x["Path"].startswith("modelo_rf_marinho/rf_")
        ]
        assert any(x["Path"].endswith(".joblib") for x in a) and any(
            x["Path"].endswith(".rds") for x in a
        )
        for x in a:
            f = Path(work) / s / Path(x["Path"]).name
            for i in range(600):
                if f.exists() and f.stat().st_size == x["Size"]:
                    break
                time.sleep(1)
            else:
                raise RuntimeError(str(f))
            z.write(f, "exclusivas-es-ocean/" + s + "/" + f.name)
with zipfile.ZipFile(tmp) as z:
    assert not z.testzip()
    print(len(z.namelist()), tmp.stat().st_size, flush=True)
tmp.rename(dest)
