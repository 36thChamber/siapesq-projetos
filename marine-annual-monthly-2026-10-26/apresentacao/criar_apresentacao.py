from pathlib import Path
import sys, json, hashlib, shutil
BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE/'presentation_deps'))
import boto3, numpy as np, rasterio, matplotlib
from PIL import Image
from pptx import Presentation
from pptx.util import Pt
from pptx.dml.color import RGBColor
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from concurrent.futures import ThreadPoolExecutor

OUT=BASE/'apresentacao'; ASSETS=OUT/'assets'; ASSETS.mkdir(exist_ok=True)
DEST=Path('/workspace/Desktop/Predicoes_Marinhas_12_Especies')
DEST.mkdir(exist_ok=True)
CFG=json.loads((BASE/'config.json').read_text()); AUDIT=json.loads((BASE/'audit.json').read_text())
S3=boto3.client('s3',region_name=CFG['bucket_region'])
MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
items=[]
for r in AUDIT['annual']:
 f=next(x for x in r['files'] if x['key'].endswith('_adequabilidade.tif'))
 e=next(x for x in r['files'] if 'extrapolation_fraction' in x)
 items.append(dict(f,label=r['species'],warning=e['extrapolation_fraction']>.85,group='annual'))
for i,r in enumerate(x for x in AUDIT['caretta_monthly'] if x['method']=='mensal_modelo_mes'):
 f=next(x for x in r['files'] if x['key'].endswith('_adequabilidade.tif'))
 items.append(dict(f,label=MONTHS[i],warning=False,group='monthly'))

def prepare(it):
 path=ASSETS/Path(it['key']).name
 if not path.exists():S3.download_file(CFG['bucket'],it['key'],str(path))
 assert hashlib.sha256(path.read_bytes()).hexdigest()==it['sha256']
 with rasterio.open(path) as ds:
  a=ds.read(1,masked=True); assert ds.crs.to_string()=='EPSG:4326'
  it['bounds']=list(ds.bounds)
  rgba=matplotlib.colormaps['viridis'](a.filled(0),bytes=True)
  rgba[np.ma.getmaskarray(a)]=[231,236,241,255]
 img=Image.fromarray(rgba).convert('RGB'); png=path.with_suffix('.png');img.save(png)
 it['image']=str(png)
 return it
with ThreadPoolExecutor(max_workers=6) as pool:items=list(pool.map(prepare,items))
assert len(items)==24 and all(x['bounds']==items[0]['bounds'] for x in items)
bar=np.tile(np.linspace(0,1,600),(18,1));Image.fromarray(matplotlib.colormaps['viridis'](bar,bytes=True)).convert('RGB').save(ASSETS/'escala.png')

W,H=1152,720
prs=Presentation();prs.slide_width=Pt(W);prs.slide_height=Pt(H)
ppt=OUT/'Predicoes_Marinhas_12_Especies.pptx';pdf=OUT/'Predicoes_Marinhas_12_Especies.pdf'
cv=canvas.Canvas(str(pdf),pagesize=(W,H));cv.setTitle('Predições marinhas — anuais e mensais de Caretta caretta');cv.setAuthor('SIAPESQ')
for name,file in [('DV','DejaVuSans.ttf'),('DVB','DejaVuSans-Bold.ttf'),('DVI','DejaVuSans-Oblique.ttf')]:pdfmetrics.registerFont(TTFont(name,str(Path(matplotlib.get_data_path())/'fonts'/'ttf'/file)))
BG='F5F7FA';INK='142A3A';MUTED='506477';ACCENT='008B8B'
slide=None

def rect(x,y,w,h,color):
 sh=slide.shapes.add_shape(1,Pt(x),Pt(y),Pt(w),Pt(h));sh.fill.solid();sh.fill.fore_color.rgb=RGBColor.from_string(color);sh.line.fill.background()
 cv.setFillColor('#'+color);cv.rect(x,H-y-h,w,h,fill=1,stroke=0)

def text(t,x,y,w,h,size=14,bold=False,italic=False,color=INK):
 box=slide.shapes.add_textbox(Pt(x),Pt(y),Pt(w),Pt(h));tf=box.text_frame
 tf.margin_left=tf.margin_right=tf.margin_top=tf.margin_bottom=0
 p=tf.paragraphs[0];p.text=t;p.font.name='DejaVu Sans';p.font.size=Pt(size);p.font.bold=bold;p.font.italic=italic;p.font.color.rgb=RGBColor.from_string(color)
 cv.setFont('DVB' if bold else 'DVI' if italic else 'DV',size);cv.setFillColor('#'+color);cv.drawString(x,H-y-size,t)

def picture(path,x,y,w,h,pdf_path=None):
 slide.shapes.add_picture(str(path),Pt(x),Pt(y),width=Pt(w),height=Pt(h))
 cv.drawImage(str(pdf_path or path),x,H-y-h,w,h,mask='auto')

def start(title,subtitle,num):
 global slide
 slide=prs.slides.add_slide(prs.slide_layouts[6]);rect(0,0,W,H,BG);rect(32,30,5,48,ACCENT)
 text(title,48,27,950,36,27,True);text(subtitle,48,65,1055,25,12,color=MUTED)
 text('SIAPESQ  •  26/10/2026',32,695,600,16,9,color=MUTED);text(f'{num} / 3',1081,695,55,16,9,color=MUTED)

def legend():
 text('Adequabilidade',800,91,140,17,10,color=MUTED)
 picture(ASSETS/'escala.png',920,93,150,9)
 text('0',906,88,15,18,10,color=MUTED);text('1',1077,88,15,18,10,color=MUTED)

def grid(group):
 for i,it in enumerate(group):
  col,row=i%4,i//4;x=32+col*280;y=119+row*178
  rect(x,y,268,170,'FFFFFF')
  label=it['label']+(' *' if it['warning'] else '')
  text(label,x+12,y+7,250,21,12,bold=it['group']=='monthly',italic=it['group']=='annual')
  # Same extent and scale for all 24 rasters. Preserve geographic aspect.
  iw,ih=Image.open(it['image']).size;mh=137;mw=mh*iw/ih
  picture(it['image'],x+(268-mw)/2,y+29,mw,mh)

start('12 espécies · predições anuais','9 peixes + 3 espécies protegidas  |  Condições ambientais médias de 2015–2024',1);legend();grid(items[:12])
text('* Extrapolação >85% da área oceânica projetada; interpretar com cautela.',32,659,1080,17,10,color=MUTED)
text('Mesma extensão geográfica e escala 0–1. Cinza: sem predição. Mapas não equivalem a validação ecológica.',32,677,1080,16,9,color=MUTED)
slide.notes_slide.notes_text_frame.text='Fontes GeoTIFF e SHA-256 no arquivo fontes_apresentacao.json. Quatro anuais reaproveitadas e oito novas. Validação estatística aleatória, não espacial.'
cv.showPage()
start('Caretta caretta · 12 modelos mensais','Um modelo separado para cada mês  |  Treino com camadas do ano e mês de cada registro, 2015–2024',2);legend();grid(items[12:])
text('Cada modelo é projetado na climatologia do mês correspondente. Presenças e pseudoausências em proporção 1:1.',32,659,1080,17,10,color=MUTED)
text('Mesma extensão geográfica e escala 0–1. Cinza: sem predição.',32,677,1080,16,9,color=MUTED)
slide.notes_slide.notes_text_frame.text='Estes são os 12 modelos mensais separados, pasta mensal_modelo_mes; não são as projeções mensais de um único modelo anual.'
cv.showPage()
start('Caretta caretta · variação ao longo do ano','Animação dos 12 modelos mensais separados  |  Janeiro a dezembro',3)
gif=BASE/'gifs/Caretta_caretta_12_modelos_mensais.gif';first=ASSETS/'gif_primeiro_quadro.png'
with Image.open(gif) as im:
 assert im.n_frames==12;im.seek(0);im.convert('RGB').save(first)
height=551;width=height*1152/852;picture(gif,(W-width)/2,105,width,height,pdf_path=first)
text('GIF incorporado no PPTX: reproduzir no modo Apresentação. No PDF, quadro estático de janeiro.',32,670,1080,18,11,color=MUTED)
slide.notes_slide.notes_text_frame.text='GIF original incorporado sem converter para imagem estática. PDF apresenta janeiro; GIF original acompanha a apresentação na mesma pasta.'
cv.showPage();cv.save();prs.save(ppt)
manifest={'bucket':CFG['bucket'],'prefix':CFG['prefix'],'monthly_method':'mensal_modelo_mes','sources':items,'gif_sha256':hashlib.sha256(gif.read_bytes()).hexdigest()}
(OUT/'fontes_apresentacao.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
for f in [ppt,pdf,gif,OUT/'fontes_apresentacao.json']:shutil.copy2(f,DEST/f.name)
print('DESTINO',DEST)
print('PPTX',ppt.stat().st_size,'PDF',pdf.stat().st_size)
