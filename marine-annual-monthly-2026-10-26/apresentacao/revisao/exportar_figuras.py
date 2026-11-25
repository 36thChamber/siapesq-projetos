from pathlib import Path
import json
HERE=Path(__file__).resolve().parent
source=HERE/'refazer.py'
ns={'__file__':str(source),'__name__':'regional_figures'}
exec(compile(source.read_text().split('\nannual=shell(')[0],str(source),'exec'),ns)
plt=ns['plt'];Image=ns['Image'];Rectangle=ns['Rectangle'];Normalize=ns['Normalize']
OUT=Path('/workspace/Desktop/Figuras_Recortadas_RS_SC_PR')
annual=OUT/'01_Anuais';monthly=OUT/'02_Caretta_Mensais'
annual.mkdir(parents=True,exist_ok=True);monthly.mkdir(exist_ok=True)
manifest=[]
for i,it in enumerate(ns['SOURCES']):
 fig=plt.figure(figsize=(8,10),dpi=240,facecolor='white')
 fig.patches.append(Rectangle((0,.895),1,.105,transform=fig.transFigure,facecolor=ns['INK'],zorder=-1))
 title=it['label'] if i<12 else 'Caretta caretta'
 subtitle='Predição anual · 2015–2024' if i<12 else f'{ns["MONTHS"][i-12]} · modelo mensal específico'
 fig.text(.045,.957,title,fontsize=20,fontstyle='italic',color='white',va='center')
 fig.text(.045,.918,subtitle,fontsize=12,color='#d6e8ed',va='center')
 ax=fig.add_axes([.835,.905,.14,.084]);ax.imshow(ns['logo']);ax.axis('off')
 ns['map_ax'](fig,[.115,.225,.79,.645],i,large=True)
 cax=fig.add_axes([.20,.105,.60,.018]);cb=fig.colorbar(plt.cm.ScalarMappable(norm=Normalize(0,1),cmap=ns['cmap']),cax=cax,orientation='horizontal',ticks=[0,.2,.4,.6,.8,1]);cb.ax.tick_params(labelsize=10)
 fig.text(.5,.142,'Adequabilidade',ha='center',fontsize=13,weight='bold',color=ns['INK'])
 fig.text(.12,.108,'Baixa',ha='center',fontsize=10,color=ns['INK']);fig.text(.87,.108,'Alta',ha='center',fontsize=10,color=ns['INK'])
 fig.text(.5,.049,'Litoral de RS / SC / PR · Cinza: terra ou sem dado',ha='center',size=10,color=ns['MUTED'])
 fig.text(.5,.027,'Recorte dos dados originais · Escala fixa de 0 a 1 · SIAPESQ',ha='center',size=9,color=ns['MUTED'])
 name=(it['label'].replace(' ','_')+'_Anual_RS_SC_PR.png') if i<12 else f'Caretta_caretta_{i-11:02d}_{ns["MONTHS"][i-12]}_RS_SC_PR.png'
 dest=(annual if i<12 else monthly)/name
 fig.savefig(dest,dpi=240);plt.close(fig)
 with Image.open(dest) as im:assert im.size==(1920,2400)
 manifest.append({'file':str(dest.relative_to(OUT)),'source_s3_key':it['key'],'source_sha256':it['sha256'],'bbox':ns['REGION'],'pixels':[1920,2400],'palette':'turbo'})
(OUT/'fontes.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
assert len(list(annual.glob('*.png')))==12 and len(list(monthly.glob('*.png')))==12
print('OK: 24 figuras PNG, 1920 x 2400 px, 240 dpi. Pasta:',OUT)
