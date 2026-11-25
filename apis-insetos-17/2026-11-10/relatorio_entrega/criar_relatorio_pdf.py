from pathlib import Path
import csv, json, statistics
from collections import Counter
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter

OUT=Path(__file__).resolve().parent
BASE=OUT.parent
status=json.loads((BASE/"status.json").read_text(encoding="utf-8"))
audit=json.loads((BASE/"audit_final.json").read_text(encoding="utf-8"))
assert status["status"]=="results_verified", "Aguardar auditoria final."
assert status["completed_scenarios"]==17
assert not audit["raster_and_report_errors"]
months=["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]
names=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
order=[("anual_2015_2024","Anual 2015-2024")]
order += [(f"mensal_{i:02d}_{m}",names[i-1]) for i,m in enumerate(months,1)]
order += [(f"futuro_{y}_ssp{s}",f"{y} SSP{str(s)[0]}-{str(s)[1]}.{str(s)[2]}") for y in (2050,2100) for s in (245,585)]
records={r["scenario"]:r for r in audit["records"]}
assert set(records)==set(s for s,_ in order)
summary={r["cenario"]:r for r in csv.DictReader((BASE/"RESUMO_17_CENARIOS.csv").open(encoding="utf-8"))}
evals=list(csv.DictReader((BASE/"Apis_mellifera/modelo_rf_climatologico/rf_Apis_mellifera_clima_eval.csv").open()))
metrics={k:[float(x[k]) for x in evals] for k in ["AUC","TSS","F1"]}
count=Counter(r["coherence"]["veredito"] for r in records.values())
counts=", ".join(f"{v} {k}" for k,v in sorted(count.items()))
fmt=lambda x,n=3:f"{float(x):.{n}f}".replace(".",",")
cost=json.loads((BASE/"ec2_costs.json").read_text(encoding="utf-8")) if (BASE/"ec2_costs.json").exists() else {}
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name="ReportTitle",fontName="Helvetica-Bold",fontSize=23,leading=27,spaceAfter=12,textColor=colors.black))
styles.add(ParagraphStyle(name="ReportSub",fontName="Helvetica",fontSize=11,leading=15,spaceAfter=16,textColor=colors.HexColor("#444444")))
styles.add(ParagraphStyle(name="H",fontName="Helvetica-Bold",fontSize=14,leading=18,spaceBefore=14,spaceAfter=8,textColor=colors.black))
styles.add(ParagraphStyle(name="B",fontName="Helvetica",fontSize=11,leading=15,spaceAfter=8))
styles.add(ParagraphStyle(name="SmallReport",fontName="Helvetica",fontSize=9,leading=12,spaceAfter=6,textColor=colors.HexColor("#444444")))
styles.add(ParagraphStyle(name="Cell",fontName="Helvetica",fontSize=10.2,leading=13))
styles.add(ParagraphStyle(name="CellCenter",fontName="Helvetica",fontSize=10.2,leading=13,alignment=TA_CENTER))
styles.add(ParagraphStyle(name="HeadCell",fontName="Helvetica-Bold",fontSize=10.2,leading=13,textColor=colors.white))
story=[];plain=[]
def para(text,style="B"):
    story.append(Paragraph(text,styles[style]))
    import re
    plain.append(re.sub("<[^>]+>","",text))
def table(rows,widths,center=()):
    data=[]
    for i,row in enumerate(rows):
        data.append([Paragraph(escape(str(x)),styles["HeadCell" if i==0 else ("CellCenter" if j in center else "Cell")]) for j,x in enumerate(row)])
    t=Table(data,colWidths=widths,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#243d4a")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#f2f5f6")]),("GRID",(0,0),(-1,-1),.4,colors.HexColor("#d9d9d9")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    story.extend([t,Spacer(1,10)])
    plain.append("\n".join(" | ".join(map(str,r)) for r in rows))
def page():
    story.append(PageBreak());plain.append("\n"+"="*65+"\n")
para("Apis mellifera em 17 cenários","ReportTitle")
para("Relatório técnico da reanálise com perfil insetos<br/>Rodada de 10 novembro 2026 · Brasil","ReportSub")
para("<b>Os 17 cenários foram recuperados e conferidos localmente</b>, com verificação de hashes, geometria dos rasters e limites numéricos. A entrega reúne uma projeção anual de 2015-2024, 12 mensais e quatro futuras. São projeções de um mesmo modelo, ajustado com dez réplicas bootstrap, e não 17 modelos independentes.")
para(f"A triagem de coerência classificou os cenários como {escape(counts)}. Esses rótulos avaliam um contraste espacial simples; não atestam presença real, ausência real nem validade ecológica. Um cenário SUSPEITO ou REPROVADO pode ter arquivos íntegros.")
para("Configuração e amostras","H")
para("O perfil insetos aplica rarefação espacial de 2 km, pseudoausências a pelo menos 5 km das presenças e área acessível M definida por ecorregiões, limitada a 100 km. A rodada usa ocorrências de 2000 a 2024, recorte do Brasil e semente 42.")
table([
["Etapa","Presenças","Pseudoausências"],
["Após preparação espacial","2.721","2.721"],
["Após deduplicação da captura","2.721","2.719"],
["Treino final completo e balanceado","1.751","1.751"]
],[282,111,111],center=(1,2))
para("Os 11 preditores são temperatura do ar a 2 m, evaporação, precipitação, NDVI, altitude, AWC, uso do solo MapBiomas e quatro amplitudes sazonais. O treino final mantém proporção 1:1, sem duplicar a classe minoritária. A grade de saída é de 0,01°; o clima de origem é de 0,1°, portanto o refinamento da grade não acrescenta detalhe climático independente.")
para("Desempenho interno do modelo","H")
table([["Métrica","Média","Mínimo a máximo"]]+[[k,fmt(statistics.mean(v)),f"{fmt(min(v))} a {fmt(max(v))}"] for k,v in metrics.items()],[150,140,214],center=(1,2))
para("São métricas das dez réplicas de bootstrap aleatório. Não constituem validação espacial independente nem demonstram desempenho em condições futuras.","SmallReport")
if cost:
    para(f"Custo computacional estimado até a parada verificada: até US$ {fmt(cost['estimate_compute_usd_upper'],2)}, calculado a partir de US$ {fmt(cost['hourly_usd'],4)}/h. É uma estimativa, não uma fatura; disco, transferência, IPv4 e tributos ficam separados.","SmallReport")
page()
para("Resultados dos 17 cenários","ReportTitle")
para("Integridade de arquivos e triagem científica são verificações distintas. A tabela reproduz os indicadores dos produtos finais; o painel PNG permite comparar os mapas na mesma escala de 0 a 1.","B")
rows=[["Cenário","Triagem","Razão D/F","Extrapolação"]]
for key,label in order:
    r=records[key];c=r["coherence"]
    rows.append([label,c["veredito"],fmt(c["razao_dentro_fora"],2),fmt(summary[key]["extrapolacao_pct"],2)+"%"])
table(rows,[154,128,100,122],center=(2,3))
para("<b>Razão D/F</b> é a adequabilidade média dentro de 50 km das presenças de treino dividida pela média além de 100 km. É uma triagem baseada nas próprias ocorrências, sem amostra independente. Nos cenários futuros, usa ocorrências atuais e não valida a distribuição futura.")
para("<b>Extrapolação</b> é a porcentagem de células válidas do diagnóstico com pelo menos uma variável contínua fora do intervalo de treino. O denominador e a reamostragem diferem dos mapas de adequabilidade. Não representa porcentagem de território ocupado nem probabilidade de erro.","SmallReport")
para("Os percentuais são contagens de células em grade geográfica, sem ponderação por área. Comparações de área, ganho ou perda de habitat exigem máscara comum, método apropriado de área e revisão da extrapolação.","SmallReport")
page()
para("Limites científicos e uso recomendado","ReportTitle")
para("<b>1. Perda desigual de dados.</b> AWC está ausente em 934 de 2.721 presenças (34,33%) e 51 de 2.719 pseudoausências (1,88%) após a deduplicação da captura. Retirar registros incompletos pode alterar a cobertura ambiental e espacial. O balanceamento 1:1 posterior não corrige esse viés.")
para("<b>2. Validação ainda necessária.</b> AUC, TSS e F1 medem desempenho interno por bootstrap aleatório. A proximidade das ocorrências na triagem não comprova ausência nas áreas distantes. Priorizar validação espacial independente e revisão das ocorrências antes de decisões ecológicas.")
para("<b>3. Uso do solo consistente, com classes novas.</b> MapBiomas é usado no treino e em todos os cenários; não há mistura com categorias de WorldCover. As classes 31, 32, 62 e 75 não aparecem no treino e somam 0,031% das células válidas de uso do solo. O preditor existente as codifica fora dos indicadores observados, exigindo cautela local.")
para("<b>4. Futuros condicionais.</b> As projeções para 2050 e 2100, nos cenários SSP2-4.5 e SSP5-8.5, mantêm NDVI, uso do solo e amplitudes sazonais atuais. Não incorporam mudanças futuras nesses componentes. Os mapas mensais também projetam o modelo anual, sem reajuste independente por mês.")
para("<b>5. Diagnóstico de extrapolação limitado.</b> O raster conta de zero a dez variáveis contínuas fora da faixa de treino. Usa reamostragem por vizinho mais próximo, enquanto a adequabilidade usa interpolação bilinear das variáveis contínuas. Não mede novidade multivariada nem novidade de categorias, e não deve ser lido como probabilidade.")
para("<b>6. Escala e cobertura das fontes.</b> Os mapas expressam adequabilidade relativa do modelo, não probabilidade calibrada de presença ou abundância. SpeciesLink, BIEN e ALA não estavam configurados; eBird não forneceu taxonomia utilizável e EMODnet não respondeu. Essas lacunas limitam a abrangência da coleta.")
para("Rastreabilidade e próximos passos","H")
para("A rodada foi executada em diretório isolado, preservando resultados anteriores. O ambiente de projeção na EC2 foi registrado separadamente; diferenças de versões devem acompanhar qualquer comparação entre execuções. O painel foi reduzido por média apenas para visualização: análises locais devem usar os GeoTIFFs originais.")
para("Revisar os cenários sinalizados e o diagnóstico de extrapolação; investigar a perda de AWC; e realizar validação espacial independente antes de usar os mapas para priorização ou inferência ecológica.")
para("Fontes da execução","H")
para("audit_final.json; RESUMO_17_CENARIOS.csv; status.json; README.md; RESSALVAS_CIENTIFICAS.md; training_data_quality.json; spatial_quality.json; environmental_scenario_ranges.csv; ec2_environment.json; ec2_costs.json; rf_Apis_mellifera_clima_eval.csv; diagnósticos de coerência e extrapolação por cenário.","SmallReport")
para("Acompanhamentos: painel APIS_17_MAPAS_ADEQUABILIDADE.png e rasters de adequabilidade, incerteza e extrapolação por cenário.","SmallReport")
def footer(canvas,doc):
    canvas.saveState();canvas.setFont("Helvetica",8);canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(54,27,"Apis mellifera | Perfil insetos | 10 novembro 2026")
    canvas.drawRightString(letter[0]-54,27,str(doc.page))
    canvas.restoreState()
target=OUT/"RELATORIO_TECNICO_APIS_17_CENARIOS.pdf"
doc=SimpleDocTemplate(str(target),pagesize=letter,rightMargin=54,leftMargin=54,topMargin=45,bottomMargin=43,title="Apis mellifera em 17 cenários",author="",subject="Reanálise com perfil insetos e limitações científicas")
doc.build(story,onFirstPage=footer,onLaterPages=footer)
(OUT/"RESUMO_TECNICO_APIS_17_CENARIOS.txt").write_text("\n\n".join(plain),encoding="utf-8")
(OUT/"relatorio_proveniencia.json").write_text(json.dumps({"audit_verified_utc":audit["local_verified_utc"],"model_sha256":audit["model_sha256"],"train_sha256":audit["train_sha256"],"scenario_count":len(order),"outcomes":count,"metric_means":{k:statistics.mean(v) for k,v in metrics.items()},"format":"PDF gerado diretamente com ReportLab; sem conversão DOCX."},ensure_ascii=False,indent=2),encoding="utf-8")
print(target)

