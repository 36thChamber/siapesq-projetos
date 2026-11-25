from pathlib import Path
import sys,json,shutil,hashlib,zipfile
ROOT=Path(__file__).resolve().parent;BASE=ROOT.parents[1]
sys.path.insert(0,str(BASE/'presentation_deps'))
import numpy as np,rasterio,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon,Rectangle
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.colors import Normalize
from PIL import Image
from pptx import Presentation
from pptx.util import Inches

SOURCES=json.loads((BASE/'apresentacao/fontes_apresentacao.json').read_text())['sources']
PHOTOS=json.loads((ROOT/'fotos_selecionadas.json').read_text())
STATES=json.load(open('/workspace/ste-predictions-migration/models-reference/01_rotina/01_captacao_ocorrencias/gbif_reference_cache/ne_50m_admin_1_states_provinces.geojson'))['features']
REGION=(-54,-34,-46.5,-24.4)
COMMON=['Corvina','Anchova','Tainha','Atum-patudo','Sardinha-verdadeira','Bonito-listrado','Albacora-laje','Albacora-branca','Bagre-branco','Tartaruga-cabeçuda','Golfinho-nariz-de-garrafa','Baleia-jubarte']
MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
BG='#eef3f5';INK='#123346';MUTED='#426173';LAND='#e2e6e8'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12})
logo=Image.open(ROOT/'logo.png');cmap=plt.colormaps['turbo'].copy();cmap.set_bad(LAND)
arrays=[]
for it in SOURCES:
 p=BASE/'apresentacao/assets'/Path(it['key']).name
 assert hashlib.sha256(p.read_bytes()).hexdigest()==it['sha256']
 with rasterio.open(p) as ds:
  win=rasterio.windows.from_bounds(*REGION,transform=ds.transform).round_offsets().round_lengths()
  a=ds.read(1,window=win,masked=True);bounds=rasterio.windows.bounds(win,ds.transform)
 arrays.append((a,bounds))


def map_ax(fig,box,index,labels=True,large=False):
 ax=fig.add_axes(box);a,b=arrays[index]
 ax.imshow(a,extent=(b[0],b[2],b[1],b[3]),origin='upper',cmap=cmap,vmin=0,vmax=1,interpolation='nearest')
 for f in STATES:
  if f['properties'].get('admin')!='Brazil':continue
  geom=f['geometry'];polys=[geom['coordinates']] if geom['type']=='Polygon' else geom['coordinates'] if geom['type']=='MultiPolygon' else []
  for poly in polys:
   xy=np.asarray(poly[0]);
   if xy[:,0].max()<REGION[0] or xy[:,0].min()>REGION[2] or xy[:,1].max()<REGION[1] or xy[:,1].min()>REGION[3]:continue
   ax.add_patch(Polygon(xy,facecolor=LAND,edgecolor='#6b7d86',linewidth=.65,zorder=3))
 if labels:
  for label,x,y in [('PR',-50.5,-25.15),('SC',-50.6,-27.3),('RS',-52.4,-30.5)]:
   ax.text(x,y,label,fontsize=14 if large else 10,color=INK,ha='center',weight='bold',zorder=5)
 ax.set_xlim(REGION[0],REGION[2]);ax.set_ylim(REGION[1],REGION[3]);ax.set_xticks([]);ax.set_yticks([])
 for sp in ax.spines.values():sp.set_edgecolor('#c3d1d8')
 if large:
  ax.set_xticks([-54,-52,-50,-48]);ax.set_yticks([-34,-32,-30,-28,-26]);ax.tick_params(labelsize=10)
  ax.set_xlabel('Longitude',fontsize=11);ax.set_ylabel('Latitude',fontsize=11)
 return ax

def img_ax(fig,box,path):
 ax=fig.add_axes(box);ax.imshow(Image.open(path));ax.axis('off');return ax

def shell(title,sub,num):
 fig=plt.figure(figsize=(16,10),dpi=150,facecolor=BG)
 fig.patches.append(Rectangle((0,.875),1,.125,transform=fig.transFigure,facecolor=INK,zorder=-1))
 fig.text(.025,.95,title,color='white',size=23,weight='bold',va='center')
 fig.text(.025,.902,sub,color='#d6e8ed',size=12,va='center')
 ax=fig.add_axes([.872,.889,.108,.098]);ax.imshow(logo);ax.axis('off')
 fig.text(.025,.018,'SIAPESQ  •  Litoral de RS / SC / PR  •  26/10/2026',size=9,color=MUTED)
 fig.text(.955,.018,f'{num} / 3',size=9,color=MUTED)
 return fig

def legend(fig,y=.058):
 ax=fig.add_axes([.33,y,.42,.015]);cb=fig.colorbar(plt.cm.ScalarMappable(norm=Normalize(0,1),cmap=cmap),cax=ax,orientation='horizontal',ticks=[0,.2,.4,.6,.8,1]);cb.ax.tick_params(labelsize=11,pad=2)
 fig.text(.025,y+.002,'ADEQUABILIDADE',fontsize=11,color=INK,weight='bold')
 fig.text(.265,y+.002,'Baixa',fontsize=11,color=INK);fig.text(.765,y+.002,'Alta',fontsize=11,color=INK)
 fig.text(.84,y+.002,'Cinza: terra / sem dado',fontsize=9,color=MUTED)

def card(fig,x,y,w,h):
 fig.patches.append(Rectangle((x,y),w,h,transform=fig.transFigure,facecolor='white',edgecolor='#dae4e9',linewidth=.7,zorder=-1))

annual=shell('12 espécies · predições anuais','Recorte regional ampliado  |  Condições ambientais médias de 2015–2024',1)
for i,it in enumerate(SOURCES[:12]):
 col,row=i%4,i//4;x=.02+col*.245;y=.115+(2-row)*.249;w=.235;h=.241
 card(annual,x,y,w,h)
 annual.text(x+.009,y+h-.021,COMMON[i],size=11.5,weight='bold',color=INK)
 annual.text(x+.009,y+h-.043,it['label'],size=10.5,fontstyle='italic',color=MUTED)
 map_ax(annual,[x+.006,y+.008,.114,.182],i)
 img_ax(annual,[x+.125,y+.052,.102,.128],PHOTOS[i]['file'])
 annual.text(x+.127,y+.036,'Foto: '+PHOTOS[i]['credit'],size=6.7,color=MUTED,wrap=True)
legend(annual)
annual.text(.025,.088,'Escala única para os 12 mapas. Valores recortados dos GeoTIFFs originais; modelos não foram retreinados.',size=9,color=MUTED)

monthly=shell('Caretta caretta · 12 modelos mensais','Um modelo específico por mês  |  Camadas ambientais de 2015–2024  |  RS / SC / PR',2)
for i in range(12):
 col,row=i%4,i//4;x=.02+col*.245;y=.115+(2-row)*.249;w=.235;h=.241
 card(monthly,x,y,w,h)
 monthly.text(x+.012,y+h-.029,f'{i+1:02d}  {MONTHS[i]}',size=14,weight='bold',color=INK)
 map_ax(monthly,[x+.044,y+.007,.147,.195],i+12)
legend(monthly)
monthly.text(.025,.088,'Cada mapa usa o modelo treinado para aquele mês. Escala fixa de 0 a 1; cinza indica terra ou ausência de dado.',size=9,color=MUTED)

frames=[];third_first=None
for i in range(12):
 f=shell('Caretta caretta · ciclo mensal',f'{MONTHS[i]}  |  Modelo mensal {i+1:02d}/12  |  Recorte RS / SC / PR',3)
 map_ax(f,[.09,.16,.49,.68],i+12,large=True)
 img_ax(f,[.62,.39,.33,.36],PHOTOS[9]['file'])
 f.text(.64,.78,'TARTARUGA-CABEÇUDA',size=16,color=INK,weight='bold')
 f.text(.64,.36,'Caretta caretta',size=18,fontstyle='italic',color=INK)
 f.text(.64,.32,'Foto: T. Moore / NOAA',size=11,color=MUTED)
 f.text(.64,.25,'12 modelos separados\nUm para cada mês do ano',size=17,color=INK,linespacing=1.5)
 legend(f,.077)
 f.text(.025,.043,'GIF animado no PPTX. No PDF: quadro de janeiro. Resolução e valores originais preservados.',size=9,color=MUTED)
 f.set_dpi(100);f.canvas.draw();arr=np.asarray(f.canvas.buffer_rgba())[:,:,:3].copy();frames.append(Image.fromarray(arr))
 if i==0:third_first=f
 else:plt.close(f)
gif=ROOT/'Caretta_caretta_12_modelos_mensais_RS_SC_PR.gif'
palette=frames[0].quantize(colors=256)
converted=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
converted[0].save(gif,save_all=True,append_images=converted[1:],duration=1000,loop=0,disposal=2,optimize=False)

pdf=ROOT/'Predicoes_Marinhas_RS_SC_PR.pdf';ppt=ROOT/'Predicoes_Marinhas_RS_SC_PR.pptx'
figs=[annual,monthly,third_first]
with PdfPages(pdf) as doc:
 for n,f in enumerate(figs,1):f.savefig(ROOT/f'slide_{n}.png',dpi=180);doc.savefig(f)
prs=Presentation();prs.slide_width=Inches(16);prs.slide_height=Inches(10)
for i in range(3):
 s=prs.slides.add_slide(prs.slide_layouts[6]);s.shapes.add_picture(str(gif if i==2 else ROOT/f'slide_{i+1}.png'),0,0,width=prs.slide_width,height=prs.slide_height)
 s.notes_slide.notes_text_frame.text='Recorte geográfico: '+str(REGION)+'; paleta turbo conforme 04_modeling/predizer_marinho.py. Fonte dos modelos: lote marine-annual-monthly-2026-10-26-perfil-1x1. Fotografias e licenças:\n'+'\n'.join(x['name']+' — '+x['credit']+' — '+x['source']+' — '+x['license'] for x in PHOTOS)
prs.save(ppt)
credits=['FONTES E CRÉDITOS — SIAPESQ','Logo: https://api.example.invalid/static/media/siapesqLogoB.19ab8ba5d9be0b883e76.png','Paleta: turbo, padrão do script 04_modeling/predizer_marinho.py','Divisas: Natural Earth, ne_50m_admin_1_states_provinces (domínio público)','Recorte (oeste, sul, leste, norte): '+str(REGION),'Os GeoTIFFs não foram reestimados ou normalizados; somente recortados para apresentação.','As avaliações estatísticas não equivalem a validação ecológica. Extrapolação elevada no domínio completo consta no relatório do lote.','']
for x in PHOTOS:credits += [x['name'],x['credit'],x['source'],x['license'],'']
(ROOT/'Creditos_e_Fontes.txt').write_text('\n'.join(credits))
DEST=Path('/workspace/Desktop/Predicoes_Marinhas_12_Especies');backup=DEST/'versao_anterior';backup.mkdir(exist_ok=True)
for name in ['Predicoes_Marinhas_12_Especies.pdf','Predicoes_Marinhas_12_Especies.pptx','Caretta_caretta_12_modelos_mensais.gif']:
 p=DEST/name
 if p.exists() and not (backup/name).exists():shutil.copy2(p,backup/name)
for p in [pdf,ppt,gif,ROOT/'Creditos_e_Fontes.txt']:shutil.copy2(p,DEST/p.name)
print('ENTREGUE',DEST)
