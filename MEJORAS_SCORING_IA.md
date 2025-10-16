# 🎯 Mejoras al Sistema de Scoring con IA

## ✨ Cambios Implementados

Hemos actualizado completamente los prompts de MoonshotAI para que el sistema entienda su propósito real: **evaluación crediticia para préstamos hipotecarios en México**.

---

## 🔥 Antes vs Ahora

### ❌ ANTES:
```
"Eres un experto analista financiero..."
- Extraía datos pero no calculaba nada específico
- No entendía el contexto de crédito hipotecario
- No aplicaba estándares mexicanos
- Análisis genérico sin números concretos
```

### ✅ AHORA:
```
"Eres el analista crediticio principal de HAVI..."
- Entiende que es para préstamos hipotecarios
- Aplica estándares crediticios mexicanos (35% ingreso)
- Calcula score específico con metodología clara
- Usa fórmulas matemáticas para préstamo máximo
- Genera análisis con números y justificaciones
```

---

## 📊 Análisis de Documentos Individuales

### Contexto Agregado:

Ahora la IA sabe que:
- **Esto es HAVI**, plataforma mexicana de crédito hipotecario
- Los documentos son para **evaluar capacidad de pago**
- Estándar mexicano: **pago mensual ≤ 35% del ingreso**
- Debe evaluar: capacidad de pago, estabilidad, ahorro

### HAVI-Score por Documento (0-100)

La IA ahora calcula el score con **criterios específicos**:

#### 📄 Estado de Cuenta Bancario
```
Score 80-100: Saldo >$50,000, ahorro >25%, sin sobregiros
  Fórmula:
  - Base: 40 pts (tener el documento)
  - +30 pts por nivel de saldo (proporcional)
  - +30 pts por capacidad de ahorro (proporcional)
  - -5 pts por cada sobregiro
```

#### 💰 Recibo de Nómina
```
Score 80-100: Salario neto >$25,000, empleo formal, prestaciones
  Fórmula:
  - Base: 40 pts
  - +40 pts por nivel salarial (proporcional)
  - +10 pts por prestaciones (IMSS, AFORE)
  - +10 pts por antigüedad >1 año
```

#### 📊 Declaración Fiscal
```
Score 80-100: Ingresos anuales >$300,000, RFC activo
  Fórmula:
  - Base: 30 pts
  - +50 pts por nivel de ingresos (proporcional)
  - +20 pts por historial fiscal
```

#### 🪪 Identificación Official
```
Score 90-100: INE/Pasaporte vigente, CURP válido
  Fórmula:
  - Base: 60 pts
  - +30 pts por vigencia y claridad
  - +10 pts por CURP visible
```

#### 🏠 Comprobante de Domicilio
```
Score 90-100: Recibo <3 meses, dirección clara, titular coincide
  Fórmula:
  - Base: 50 pts
  - +40 pts por antigüedad (<3 meses mejor)
  - +10 pts por coincidencia de titular
```

#### 💼 Carta Laboral
```
Score 80-100: Carta oficial, sueldo >$20,000, antigüedad >2 años
  Fórmula:
  - Base: 40 pts
  - +35 pts por nivel salarial
  - +25 pts por antigüedad
```

---

## 🎯 Análisis Crediticio Completo

### Metodología HAVI (Score 300-850)

La IA ahora calcula el score crediticio usando **4 factores ponderados**:

#### 1. Nivel de Ingresos (35%)
```
>$30,000/mes:      +300 puntos
$20,000-$30,000:   +250 puntos
$15,000-$20,000:   +200 puntos
$10,000-$15,000:   +150 puntos
<$10,000:          +100 puntos
```

#### 2. Capacidad de Ahorro (25%)
```
Saldo >$50k + ahorro >25%:           +200 puntos
Saldo $30-50k + ahorro 15-25%:       +150 puntos
Saldo $10-30k + ahorro 5-15%:        +100 puntos
Saldo <$10k o sin ahorro:            +50 puntos
```

#### 3. Estabilidad Laboral (20%)
```
Formal con >2 años:      +150 puntos
Formal con 1-2 años:     +120 puntos
Formal con <1 año:       +80 puntos
Informal:                +40 puntos
```

#### 4. Calidad de Documentos (20%)
```
Todos con score >80:     +150 puntos
Completos con score >60: +120 puntos
Documentos básicos:      +80 puntos
Incompletos:             +40 puntos
```

**Base mínima:** 300 puntos
**Máximo posible:** 300 + 300 + 200 + 150 + 150 = 1100 → normalizado a 850

---

## 💰 Cálculo de Capacidad de Préstamo

### Fórmula Implementada:

```
Ingreso mensual disponible = Ingreso neto × 0.35 (35%)
Préstamo máximo = Ingreso disponible × plazo (240 meses) × 0.9

Ejemplo con $20,000/mes:
  Disponible: $20,000 × 0.35 = $7,000/mes
  Préstamo: $7,000 × 240 × 0.9 = $1,512,000
```

### Enganche Recomendado según Score:

| Score | Enganche | Perfil |
|-------|----------|--------|
| 750-850 | 10-15% | Excelente |
| 650-749 | 15-20% | Muy bueno |
| 600-649 | 20-25% | Bueno |
| 550-599 | 25-30% | Regular |
| 300-549 | 30-40% | Alto riesgo |

---

## 📈 Nivel de Riesgo

La IA ahora evalúa riesgo con criterios específicos:

- **LOW (Bajo)**: Score ≥700, ingresos estables, ahorro constante
- **MEDIUM (Medio)**: Score 550-699, ingresos regulares, ahorro moderado
- **HIGH (Alto)**: Score <550, ingresos inestables, sin ahorro

---

## 💡 Recomendaciones Accionables

Ahora la IA genera recomendaciones **específicas y accionables**:

### Ejemplos:
- ✅ "Incrementa tu ahorro mensual a $5,000 para mejorar tu score en 50 puntos"
- ✅ "Mantén tu saldo bancario por encima de $30,000 consistentemente"
- ✅ "Documenta al menos 2 años de antigüedad laboral para mejor tasa"
- ✅ "Considera un co-deudor para aumentar capacidad de préstamo en 40%"

---

## 🎨 Visualización en Frontend

### Documento Individual:

```
🤖 ANÁLISIS INTELIGENTE CON MOONSHOTAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 HAVI-SCORE: 85/100
🟢 BAJO RIESGO

📊 ANÁLISIS CREDITICIO:
El estado de cuenta muestra excelente capacidad de ahorro
con saldo promedio de $45,000 y tasa de ahorro del 30%.
Ingresos mensuales estables de $25,000 sin sobregiros.

💡 RECOMENDACIONES:
1. Mantén este nivel de ahorro para mejores tasas
2. Considera aumentar tu enganche al 15% para menor interés

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DATOS EXTRAÍDOS (5):

• SALDO ACTUAL: $45,230
• INGRESO MENSUAL: $25,000
• GASTOS MENSUALES: $17,500
• TASA AHORRO: 30%
• BANCO: BBVA
```

---

## 🔍 Instrucciones Específicas para la IA

### Análisis de Documentos:

```
1. IDENTIFICA datos clave:
   - Ingreso mensual neto
   - Saldo bancario actual
   - Gastos mensuales
   - Capacidad de ahorro
   - Tipo de empleo
   - Antigüedad laboral

2. CALCULA el HAVI-Score usando las fórmulas específicas

3. EVALÚA el nivel de riesgo con criterios objetivos

4. GENERA recomendaciones específicas y accionables
```

### Análisis Crediticio Completo:

```
1. USA DATOS REALES de los documentos (no inventes)

2. CALCULA score crediticio (300-850) con metodología HAVI

3. DETERMINA capacidad de préstamo con la fórmula:
   Ingreso × 0.35 × 240 meses × 0.9

4. RECOMIENDA enganche según el score calculado

5. INCLUYE NÚMEROS específicos en el análisis

6. EXPLICA cómo llegaste al score (justificación)
```

---

## 🎯 Resultados Esperados

### Documento Individual:
- ✅ HAVI-Score calculado (0-100)
- ✅ Nivel de riesgo (low/medium/high)
- ✅ Análisis detallado con números
- ✅ Recomendaciones específicas
- ✅ Datos extraídos estructurados

### Análisis Crediticio:
- ✅ Score crediticio (300-850)
- ✅ Capacidad de préstamo calculada
- ✅ Enganche recomendado
- ✅ Fortalezas y debilidades identificadas
- ✅ Recomendaciones accionables
- ✅ Justificación matemática del score

---

## 🚀 Cómo Probar

### 1. Reprocesar un Documento:

```bash
1. Backend: Reinicia el servidor para tomar nuevos prompts
   npm run dev

2. Frontend: Accede al dashboard
   http://localhost:3000

3. Selecciona un usuario → Ver documentos

4. Click en "🔄 Reprocesar" en cualquier documento

5. Espera el loading modal (2-5 segundos)

6. Click en "👁️ Ver y Calificar"

7. Verás el análisis de MoonshotAI con:
   - HAVI-Score calculado
   - Análisis detallado
   - Recomendaciones
   - Datos extraídos
```

### 2. Solicitar Análisis Crediticio:

```bash
Via API:
POST /api/ai/analysis/request
Authorization: Bearer {user_token}

Respuesta incluirá:
- internalScore (300-850)
- maxLoanAmount (calculado con fórmula)
- suggestedDownPayment
- detailedAnalysis con justificación
- recommendations específicas
```

---

## 📊 Ejemplo Real

### Input (Estado de Cuenta):
```json
{
  "saldo_actual": 45230,
  "ingreso_mensual": 25000,
  "gastos_mensuales": 17500,
  "banco": "BBVA"
}
```

### Output de MoonshotAI:
```json
{
  "extractedData": {
    "saldo_actual": 45230,
    "ingreso_mensual": 25000,
    "gastos_mensuales": 17500,
    "tasa_ahorro": 30,
    "banco": "BBVA"
  },
  "confidence": 95,
  "analysis": "El estado de cuenta muestra excelente capacidad de ahorro con saldo promedio de $45,000 y tasa de ahorro del 30%. Ingresos mensuales estables de $25,000 sin sobregiros registrados en los últimos 3 meses.",
  "recommendations": [
    "Mantén este nivel de ahorro consistente para mejores tasas de interés",
    "Considera aumentar tu enganche al 15% para reducir el monto del préstamo",
    "Con este perfil puedes calificar para préstamos de hasta $1.5M"
  ],
  "haviScore": 85,
  "riskLevel": "low"
}
```

### Análisis Crediticio Completo:
```json
{
  "internalScore": 750,
  "riskLevel": "low",
  "maxLoanAmount": 1512000,
  "suggestedDownPayment": 226800,
  "recommendations": [
    "Perfil crediticio excelente, apto para aprobación inmediata",
    "Capacidad de pago verificada: $7,000/mes disponibles",
    "Considera propiedades de hasta $1.7M con enganche del 15%"
  ],
  "detailedAnalysis": "Score calculado: 750/850\n\nFactores:\n- Ingresos ($25k/mes): +250 pts\n- Ahorro (30% tasa): +200 pts\n- Empleo formal >2 años: +150 pts\n- Documentos completos: +150 pts\nTotal: 750/850 = Excelente perfil",
  "strengths": [
    "Ingreso mensual estable de $25,000",
    "Tasa de ahorro del 30% (excelente)",
    "Sin historial de sobregiros",
    "Empleo formal con prestaciones"
  ],
  "weaknesses": []
}
```

---

## ✅ Ventajas del Nuevo Sistema

1. **Contexto Claro**: La IA entiende que es para crédito hipotecario
2. **Metodología Específica**: Usa fórmulas y criterios de HAVI
3. **Cálculos Matemáticos**: Números reales, no estimaciones genéricas
4. **Estándares Mexicanos**: Aplica el 35% del ingreso como máximo
5. **Análisis Justificado**: Explica cómo llegó a cada número
6. **Recomendaciones Accionables**: Pasos concretos para mejorar
7. **Consistencia**: Mismos criterios para todos los solicitantes

---

## 🎉 Resultado Final

Ahora MoonshotAI funciona como un **analista crediticio experto** que:

- ✅ Entiende el propósito (crédito hipotecario)
- ✅ Aplica metodología consistente (HAVI)
- ✅ Calcula scores con fórmulas específicas
- ✅ Genera análisis con números reales
- ✅ Proporciona recomendaciones útiles
- ✅ Justifica cada decisión matemáticamente

¡El sistema ahora **realmente evalúa** la capacidad crediticia! 🎯
