#!/usr/bin/env python3
# limiares.py — CENTRAL de limiares, rótulos e vocabulário do Laudo Técnico de QC.
#
# TUDO que decide "verde/amarelo/vermelho", classificações e as frases ecológicas de
# cada variável fica AQUI — documentado e facilmente ajustável (sem mexer na lógica).
# A interpretação é 100% DETERMINÍSTICA (regras + limiares); nenhuma IA.

from __future__ import annotations

# --- Semáforo (status) ----------------------------------------------------------
VERDE = "verde"       # 🟢 adequado, nenhuma ação
AMARELO = "amarelo"   # 🟡 atenção, monitorar/revisar
VERMELHO = "vermelho" # 🔴 crítico, ação recomendada
EMOJI = {VERDE: "🟢", AMARELO: "🟡", VERMELHO: "🔴"}
ROTULO_STATUS = {VERDE: "Excelente", AMARELO: "Atenção", VERMELHO: "Crítico"}

# --- Nº de presenças (limita a modelagem; poucas = overfitting) ------------------
N_PRES_OTIMO = 50     # >= 50 → verde
N_PRES_BOM = 30       # 30–49 → verde-claro (ok)
N_PRES_MINIMO = 15    # 15–29 → amarelo; < 15 → vermelho

# --- Correlação (|r|) ------------------------------------------------------------
CORR_MUITO_ALTA = 0.90
CORR_ALTA = 0.80
CORR_MODERADA = 0.70

# --- VIF (multicolinearidade) ----------------------------------------------------
VIF_REMOVER = 10.0
VIF_ATENCAO = 5.0

# --- Assimetria (|skewness|) -----------------------------------------------------
SKEW_FORTE = 2.0
SKEW_MODERADA = 1.0

# --- Outliers (% de pontos extremos, Z-robusto) ----------------------------------
OUTLIER_ALTO = 5.0
OUTLIER_MODERADO = 2.0

# --- Cobertura ambiental (razão hull presenças / total) --------------------------
COBERTURA_BOA = 0.60
COBERTURA_MODERADA = 0.40

# --- Valores ausentes (% de células) ---------------------------------------------
FALTANTES_CRITICO = 5.0
FALTANTES_ATENCAO = 0.5

# --- Poder discriminatório presença×ausência (|d| de Cohen) ----------------------
COHEN_GRANDE = 0.80   # boa separação
COHEN_MEDIO = 0.50
COHEN_PEQUENO = 0.20  # abaixo disso: distribuições praticamente sobrepostas

# --- Diversidade de Shannon (categóricas) ----------------------------------------
SHANNON_BAIXA = 0.5   # < 0,5 → pouca variedade de classes

# --- Score → estrelas + classificação (cortes CONFIRMADOS pelo usuário) ----------
# (limite_inferior, nº_estrelas, rótulo)
ESCALA_SCORE = [
    (90, 5, "Excelente"),
    (80, 4, "Muito boa"),
    (70, 3, "Boa"),
    (60, 2, "Necessita revisão"),
    (0, 1, "Crítico"),
]


def estrelas(n: int) -> str:
    return "★" * n + "☆" * (5 - n)


def escala_do_score(score: float) -> tuple[int, str]:
    """Devolve (nº_estrelas, rótulo) para uma nota 0–100."""
    for limite, n, rotulo in ESCALA_SCORE:
        if score >= limite:
            return n, rotulo
    return 1, "Crítico"


# --- Vocabulário ECOLÓGICO por variável ------------------------------------------
# nome legível, unidade e "tipo" (dita a narrativa de nicho). `conv` converte a
# unidade bruta para a de leitura (ex.: t2m Kelvin → °C).
VARS_ECO: dict[str, dict] = {
    "t2m": {"nome": "Temperatura do ar (2 m)", "unidade": "°C", "tipo": "temperatura",
            "conv": lambda x: x - 273.15},
    "tp": {"nome": "Precipitação (acumulado diário)", "unidade": "mm", "tipo": "chuva",
           "conv": lambda x: x * 1000.0},   # metros → mm
    "e": {"nome": "Evaporação (acumulado diário)", "unidade": "mm", "tipo": "evaporacao",
          "conv": lambda x: x * 1000.0},
    "ndvi": {"nome": "NDVI (vigor da vegetação)", "unidade": "", "tipo": "vegetacao"},
    "altitude": {"nome": "Altitude", "unidade": "m", "tipo": "altitude"},
    "slope": {"nome": "Declividade do terreno", "unidade": "°", "tipo": "relevo"},
    "clay": {"nome": "Argila no solo", "unidade": "%", "tipo": "solo_argila"},
    "awc": {"nome": "Água disponível no solo", "unidade": "v%", "tipo": "agua_solo"},
}


# Nomes legíveis das variáveis CATEGÓRICAS (uso do solo).
NOMES_CATEGORICAS = {
    "ocup_solo_mapbiomas": "Uso do solo — MapBiomas (Brasil)",
    "ocup_solo_worldcover": "Uso do solo — WorldCover (global)",
}


def nome_legivel(var: str) -> str:
    if var in VARS_ECO:
        return VARS_ECO[var]["nome"]
    return NOMES_CATEGORICAS.get(var, var)
