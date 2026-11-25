from pathlib import Path
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import rasterio
from rasterio.enums import Resampling
from matplotlib.colors import Normalize

BASE = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
status = json.loads((BASE / "status.json").read_text())
audit = json.loads((BASE / "audit_final.json").read_text())
assert status["status"] == "results_verified", "A auditoria final ainda não autorizou o relatório."
assert status["completed_scenarios"] == 17
assert not audit["raster_and_report_errors"]
months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
labels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
scenarios = [("anual_2015_2024", "Anual 2015–2024")]
scenarios += [(f"mensal_{i:02d}_{m}", labels[i-1]) for i,m in enumerate(months,1)]
scenarios += [(f"futuro_{y}_ssp{s}", f"{y} · SSP{str(s)[0]}-{str(s)[1]}.{str(s)[2]}") for y in (2050,2100) for s in (245,585)]
assert set(x[0] for x in scenarios) == set(r["scenario"] for r in audit["records"])
plt.rcParams.update({"font.family":"DejaVu Sans", "font.size":11})
fig, axes = plt.subplots(5, 4, figsize=(15, 18.1))
fig.subplots_adjust(left=.025, right=.975, top=.930, bottom=.105, wspace=.075, hspace=.13)
cmap = plt.colormaps["viridis"].copy()
cmap.set_bad("#eeeeee")
records = []
for i,(ax,(scenario,label)) in enumerate(zip(axes.flat,scenarios),1):
    path = BASE/"Apis_mellifera"/"predicoes_cenarios"/scenario/f"Apis_mellifera_{scenario}_adequabilidade.tif"
    with rasterio.open(path) as ds:
        a = ds.read(1, out_shape=(800,800), masked=True, resampling=Resampling.average)
        extent=(ds.bounds.left,ds.bounds.right,ds.bounds.bottom,ds.bounds.top)
        assert ds.crs.to_epsg()==4326
        records.append({"scenario":scenario,"raster":str(path),"width":ds.width,"height":ds.height,"crs":str(ds.crs),"bounds":list(ds.bounds),"source_sha256":next(f["sha256"] for r in audit["records"] if r["scenario"]==scenario for f in r["files"] if f["name"]==path.name)})
    ax.imshow(a,extent=extent,vmin=0,vmax=1,cmap=cmap,interpolation="nearest",origin="upper")
    ax.set_title(f"{i:02d}  {label}",fontsize=12,pad=6,loc="left")
    ax.set_xticks([]);ax.set_yticks([])
    for sp in ax.spines.values(): sp.set_color("#d4d4d4");sp.set_linewidth(.5)
for ax in list(axes.flat)[17:]:
    ax.axis("off")
axes.flat[17].text(0,.83,"LEITURA DO PAINEL\n\nUm modelo de Random Forest\nprojetado em 17 cenários.\n\nMesma extensão geográfica\ne mesma escala de 0 a 1.\n\nCinza claro = sem dados.",transform=axes.flat[17].transAxes,fontsize=12,va="top",linespacing=1.5)
axes.flat[18].text(0,.83,"INTERPRETAÇÃO\n\nAdequabilidade relativa não é\nprobabilidade calibrada de\npresença ou abundância.\n\nA validação ecológica e os\nlimites de extrapolação exigem\nleitura do relatório técnico.",transform=axes.flat[18].transAxes,fontsize=12,va="top",linespacing=1.5)
axes.flat[19].text(0,.83,"CENÁRIOS FUTUROS\n\nNDVI, uso do solo e amplitudes\nsazonais mantidos constantes.\n\nSSP2-4.5 e SSP5-8.5\npara 2050 e 2100.\n\nRecorte do Brasil · EPSG 4326",transform=axes.flat[19].transAxes,fontsize=12,va="top",linespacing=1.5)
fig.text(.025,.975,"Apis mellifera",fontstyle="italic",fontsize=26,weight="bold",va="top")
fig.text(.025,.947,"17 projeções de adequabilidade  |  Perfil insetos  |  Rodada de 10 novembro 2026",fontsize=14,va="top")
cax=fig.add_axes([.22,.067,.56,.012])
cb=fig.colorbar(plt.cm.ScalarMappable(norm=Normalize(0,1),cmap=cmap),cax=cax,orientation="horizontal",ticks=np.linspace(0,1,6))
cb.ax.set_xticklabels(["0","0,2","0,4","0,6","0,8","1"])
cb.set_label("Adequabilidade relativa",fontsize=12)
cb.outline.set_visible(False)
fig.text(.025,.027,"Fonte: 17 GeoTIFFs auditados. Grade original de 0,01°; clima de origem de 0,1°.\nVisualização reduzida por média para 800 × 800 pixels por mapa. Não usar o painel para medidas locais.",fontsize=10,color="#444444",linespacing=1.5)
target=OUT/"APIS_17_MAPAS_ADEQUABILIDADE.png"
fig.savefig(target,dpi=210,facecolor="white",metadata={"Title":"Apis mellifera 17 projeções com perfil insetos","Description":"Escala comum 0 a 1, sem dados em cinza. Fonte em GeoTIFFs auditados."})
plt.close(fig)
(OUT/"painel_fontes_e_metodo.json").write_text(json.dumps({"audit_verified_utc":audit["local_verified_utc"],"display_resampling":"average","display_grid":[800,800],"color_scale":[0,1],"records":records},ensure_ascii=False,indent=2),encoding="utf-8")
print(target)

