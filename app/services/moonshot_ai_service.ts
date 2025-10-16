import env from '#start/env'

interface MoonshotMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface MoonshotChatRequest {
  model: string
  messages: MoonshotMessage[]
  temperature?: number
  max_tokens?: number
}

interface MoonshotChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface DocumentAnalysisResult {
  extractedData: Record<string, any>
  confidence: number
  analysis: string
  recommendations: string[]
  haviScore: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface CreditAnalysisResult {
  internalScore: number
  riskLevel: 'low' | 'medium' | 'high'
  maxLoanAmount: number
  suggestedDownPayment: number
  recommendations: string[]
  detailedAnalysis: string
  strengths: string[]
  weaknesses: string[]
  moonshotAnalysis: any
}

class MoonshotAIService {
  private apiKey: string
  private apiBase: string
  private model: string = 'moonshotai/kimi-k2-0905'

  constructor() {
    const apiKey = env.get('MOONSHOT_API_KEY')
    if (!apiKey) {
      throw new Error('MOONSHOT_API_KEY no está configurada en las variables de entorno')
    }
    this.apiKey = apiKey
    // Detectar si es OpenRouter (sk-or-*) o MoonshotAI directo
    const isOpenRouter = apiKey.startsWith('sk-or-')
    this.apiBase = env.get(
      'MOONSHOT_API_BASE',
      isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.moonshot.cn/v1'
    )

    // Ajustar nombre del modelo según el provider
    if (isOpenRouter) {
      this.model = 'moonshotai/kimi-k2-0905'
    } else {
      this.model = 'kimi-k2-instruct-0905'
    }
  }

  /**
   * Realiza una petición al API de MoonshotAI
   */
  private async chat(messages: MoonshotMessage[], temperature: number = 0.6): Promise<string> {
    try {
      const request: MoonshotChatRequest = {
        model: this.model,
        messages,
        temperature,
        max_tokens: 4000
      }

      // Headers adicionales para OpenRouter
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }

      // Si es OpenRouter, agregar headers específicos
      if (this.apiBase.includes('openrouter')) {
        headers['HTTP-Referer'] = 'https://livo.app'
        headers['X-Title'] = 'LIVO - Credit Analysis'
      }

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MoonshotAI API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json() as MoonshotChatResponse

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No se recibió respuesta válida de MoonshotAI')
      }

      return data.choices[0].message.content
    } catch (error) {
      console.error('Error calling MoonshotAI API:', error)
      throw error
    }
  }

  /**
   * Analiza un documento y extrae información estructurada
   */
  async analyzeDocument(
    documentType: string,
    documentText: string
  ): Promise<DocumentAnalysisResult> {
    try {
      const systemPrompt = this.getDocumentAnalysisSystemPrompt(documentType)
      const userPrompt = this.getDocumentAnalysisUserPrompt(documentType, documentText)

      const messages: MoonshotMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const responseText = await this.chat(messages, 0.3)

      // Parsear la respuesta JSON
      const result = this.parseDocumentAnalysisResponse(responseText)

      return result
    } catch (error) {
      console.error('Error analyzing document with MoonshotAI:', error)
      throw error
    }
  }

  /**
   * Genera el prompt del sistema para análisis de documentos
   */
  private getDocumentAnalysisSystemPrompt(documentType: string): string {
    const documentTypeNames: Record<string, string> = {
      'bank_statement': 'Estado de Cuenta Bancario',
      'payroll': 'Recibo de Nómina',
      'tax_return': 'Declaración Fiscal',
      'id_document': 'Identificación Oficial',
      'proof_of_address': 'Comprobante de Domicilio',
      'employment_letter': 'Carta Laboral',
      'other': 'Documento General'
    }

    return `Eres un experto analista crediticio de HAVI, una plataforma mexicana de financiamiento hipotecario.

Tu tarea es analizar documentos financieros para EVALUAR LA CAPACIDAD CREDITICIA del solicitante.

CONTEXTO IMPORTANTE:
- Este documento es parte de una solicitud de crédito hipotecario en México
- Necesitamos determinar si el solicitante puede pagar un préstamo inmobiliario
- Los estándares mexicanos establecen que el pago mensual no debe exceder 35% del ingreso
- Evaluamos: capacidad de pago, estabilidad financiera, historial de ahorro

Tipo de documento: ${documentTypeNames[documentType] || documentType}

INSTRUCCIONES DE ANÁLISIS:

1. EXTRACCIÓN DE DATOS:
   - Extrae TODOS los montos, fechas y datos relevantes
   - Montos en pesos mexicanos (MXN)
   - Identifica patrones de ingresos y gastos

2. CÁLCULO DE HAVI-SCORE (0-100):
   Este score evalúa la calidad del documento para crédito hipotecario:

   ${this.getHaviScoreGuidelines(documentType)}

3. NIVEL DE RIESGO:
   - low: Excelente perfil crediticio, alto potencial de aprobación
   - medium: Perfil aceptable, requiere análisis adicional
   - high: Perfil débil, alto riesgo de impago

4. RECOMENDACIONES:
   - Específicas para mejorar el perfil crediticio
   - Acciones concretas que puede tomar el solicitante

FORMATO DE RESPUESTA (JSON):
{
  "extractedData": {
    // Campos específicos extraídos del documento
  },
  "confidence": 85, // Tu confianza en la extracción (0-100)
  "analysis": "Análisis detallado evaluando capacidad crediticia",
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "haviScore": 75, // Score de calidad del documento para crédito (0-100)
  "riskLevel": "low" // low, medium, high
}

Responde ÚNICAMENTE con el JSON, sin texto adicional.`
  }

  /**
   * Genera guías específicas para calcular el HAVI-Score según tipo de documento
   */
  private getHaviScoreGuidelines(documentType: string): string {
    const guidelines: Record<string, string> = {
      'bank_statement': `
   ESTADO DE CUENTA - Criterios de evaluación:
   - Score 80-100: Saldo >$50,000, ahorro mensual >25% del ingreso, sin sobregiros
   - Score 60-79: Saldo $20,000-$50,000, ahorro mensual 15-25%, máximo 2 sobregiros
   - Score 40-59: Saldo $10,000-$20,000, ahorro mensual 5-15%, 3-5 sobregiros
   - Score 0-39: Saldo <$10,000, sin ahorro, >5 sobregiros o negativos

   FÓRMULA:
   - Base: 40 puntos por tener el documento
   - +30 puntos por nivel de saldo (escala proporcional)
   - +30 puntos por capacidad de ahorro (escala proporcional)
   - Penalización: -5 puntos por cada sobregiro`,

      'payroll': `
   RECIBO DE NÓMINA - Criterios de evaluación:
   - Score 80-100: Salario neto >$25,000/mes, empleo formal, prestaciones completas
   - Score 60-79: Salario neto $15,000-$25,000/mes, empleo formal, prestaciones básicas
   - Score 40-59: Salario neto $10,000-$15,000/mes, empleo formal
   - Score 0-39: Salario neto <$10,000/mes o empleo informal

   FÓRMULA:
   - Base: 40 puntos por tener el documento
   - +40 puntos por nivel salarial (escala proporcional)
   - +10 puntos por prestaciones (IMSS, AFORE, etc)
   - +10 puntos por antigüedad >1 año`,

      'tax_return': `
   DECLARACIÓN FISCAL - Criterios de evaluación:
   - Score 80-100: Ingresos anuales >$300,000, declaración completa, RFC activo
   - Score 60-79: Ingresos anuales $180,000-$300,000, declaración completa
   - Score 40-59: Ingresos anuales $120,000-$180,000
   - Score 0-39: Ingresos <$120,000 o declaración incompleta

   FÓRMULA:
   - Base: 30 puntos por tener el documento
   - +50 puntos por nivel de ingresos (escala proporcional)
   - +20 puntos por historial fiscal (años declarando)`,

      'id_document': `
   IDENTIFICACIÓN OFICIAL - Criterios de evaluación:
   - Score 90-100: INE/Pasaporte vigente, datos completos legibles, CURP válido
   - Score 70-89: Identificación vigente, datos completos
   - Score 50-69: Identificación vigente, algunos datos ilegibles
   - Score 0-49: Identificación vencida o datos incompletos

   FÓRMULA:
   - Base: 60 puntos por tener documento oficial
   - +30 puntos por vigencia y claridad
   - +10 puntos por CURP visible`,

      'proof_of_address': `
   COMPROBANTE DE DOMICILIO - Criterios de evaluación:
   - Score 90-100: Recibo <3 meses, dirección clara, titular coincide
   - Score 70-89: Recibo <6 meses, dirección clara
   - Score 50-69: Recibo <12 meses o dirección parcial
   - Score 0-49: Recibo >12 meses o datos incompletos

   FÓRMULA:
   - Base: 50 puntos por tener comprobante
   - +40 puntos por antigüedad (<3 meses mejor)
   - +10 puntos por coincidencia de titular`,

      'employment_letter': `
   CARTA LABORAL - Criterios de evaluación:
   - Score 80-100: Carta oficial, sueldo >$20,000, antigüedad >2 años
   - Score 60-79: Carta oficial, sueldo $12,000-$20,000, antigüedad >1 año
   - Score 40-59: Carta oficial, sueldo $8,000-$12,000
   - Score 0-39: Carta informal o sueldo <$8,000

   FÓRMULA:
   - Base: 40 puntos por tener carta
   - +35 puntos por nivel salarial
   - +25 puntos por antigüedad en empresa`
    }

    return guidelines[documentType] || `
   Documento genérico - Evalúa:
   - Completitud de información (40 puntos)
   - Claridad y legibilidad (30 puntos)
   - Relevancia para crédito (30 puntos)`
  }

  /**
   * Genera el prompt del usuario para análisis de documentos
   */
  private getDocumentAnalysisUserPrompt(documentType: string, documentText: string): string {
    const fieldsByType: Record<string, string[]> = {
      'bank_statement': [
        'banco',
        'numero_cuenta',
        'titular',
        'saldo_actual',
        'ingreso_mensual',
        'gastos_mensuales',
        'fecha_inicio',
        'fecha_fin',
        'promedio_saldo',
        'transacciones_rechazadas'
      ],
      'payroll': [
        'empresa',
        'rfc_empresa',
        'empleado',
        'rfc_empleado',
        'puesto',
        'salario_bruto',
        'salario_neto',
        'deducciones',
        'prestaciones',
        'fecha_pago',
        'periodo'
      ],
      'tax_return': [
        'rfc',
        'nombre_completo',
        'regimen_fiscal',
        'ingresos_anuales',
        'deducciones',
        'impuestos_pagados',
        'ejercicio_fiscal'
      ],
      'id_document': [
        'nombre_completo',
        'fecha_nacimiento',
        'curp',
        'numero_identificacion',
        'direccion',
        'estado',
        'municipio'
      ],
      'proof_of_address': [
        'tipo_comprobante',
        'titular',
        'direccion',
        'codigo_postal',
        'fecha_emision'
      ],
      'employment_letter': [
        'empresa',
        'rfc_empresa',
        'empleado',
        'puesto',
        'salario_mensual',
        'fecha_ingreso',
        'tipo_contrato',
        'vigencia'
      ]
    }

    const fieldsToExtract = fieldsByType[documentType] || []

    return `Analiza el siguiente documento y extrae la información estructurada.

Campos a extraer: ${fieldsToExtract.join(', ')}

Texto del documento:
---
${documentText}
---

IMPORTANTE:
1. Extrae TODOS los campos que puedas identificar
2. Si un campo no está presente, omítelo del extractedData
3. Convierte montos a números (sin símbolos de moneda ni comas)
4. Calcula el haviScore basándote en:
   - Ingresos vs gastos (capacidad de ahorro)
   - Estabilidad financiera
   - Completitud de la información
5. Determina riskLevel:
   - low: Excelente perfil, alta capacidad de pago
   - medium: Buen perfil con algunas áreas de mejora
   - high: Perfil con riesgos significativos

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.`
  }

  /**
   * Parsea la respuesta del análisis de documentos
   */
  private parseDocumentAnalysisResponse(responseText: string): DocumentAnalysisResult {
    try {
      // Intentar extraer JSON del texto (por si hay texto adicional)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText

      const parsed = JSON.parse(jsonText)

      // Validar que tenga los campos requeridos
      if (!parsed.extractedData || typeof parsed.confidence !== 'number') {
        throw new Error('Respuesta inválida de MoonshotAI: faltan campos requeridos')
      }

      return {
        extractedData: parsed.extractedData,
        confidence: Math.min(100, Math.max(0, parsed.confidence)),
        analysis: parsed.analysis || 'Análisis completado',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        haviScore: parsed.haviScore || 0,
        riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel)
          ? parsed.riskLevel
          : 'medium'
      }
    } catch (error) {
      console.error('Error parsing MoonshotAI response:', error)
      console.error('Response text:', responseText)
      throw new Error('No se pudo parsear la respuesta de MoonshotAI')
    }
  }

  /**
   * Realiza un análisis crediticio completo basado en múltiples documentos
   */
  async analyzeCreditProfile(
    documents: Array<{
      type: string
      extractedData: any
      moonshotAnalysis?: any
    }>
  ): Promise<CreditAnalysisResult> {
    try {
      const systemPrompt = `Eres el analista crediticio principal de HAVI, plataforma líder de financiamiento hipotecario en México.

Tu responsabilidad es EVALUAR y APROBAR/RECHAZAR solicitudes de crédito hipotecario.

CONTEXTO DEL SISTEMA HAVI:
- Plataforma de crédito hipotecario en México
- Evaluamos capacidad de pago para préstamos inmobiliarios
- Estándar mexicano: pago mensual máximo = 35% del ingreso neto
- Calculamos score crediticio (300-850) similar al Buró de Crédito

DOCUMENTOS REQUERIDOS PARA EVALUACIÓN:
1. Estado de cuenta bancario (evalúa solvencia y ahorro)
2. Recibo de nómina (evalúa ingresos estables)
3. Identificación oficial (verifica identidad)
4. Comprobante de domicilio (opcional)
5. Carta laboral (opcional, refuerza estabilidad)
6. Declaración fiscal (opcional, para ingresos adicionales)

METODOLOGÍA DE ANÁLISIS:

1. CÁLCULO DEL SCORE CREDITICIO (300-850):

   Factores y pesos:
   - Nivel de ingresos (35%): Score base según ingreso mensual
     * >$30,000/mes: +300 puntos
     * $20,000-$30,000/mes: +250 puntos
     * $15,000-$20,000/mes: +200 puntos
     * $10,000-$15,000/mes: +150 puntos
     * <$10,000/mes: +100 puntos

   - Capacidad de ahorro (25%): Score según saldo bancario y tasa de ahorro
     * Saldo >$50,000 y ahorro >25%: +200 puntos
     * Saldo $30,000-$50,000 y ahorro 15-25%: +150 puntos
     * Saldo $10,000-$30,000 y ahorro 5-15%: +100 puntos
     * Saldo <$10,000 o sin ahorro: +50 puntos

   - Estabilidad laboral (20%): Score según tipo de empleo y antigüedad
     * Formal con >2 años: +150 puntos
     * Formal con 1-2 años: +120 puntos
     * Formal con <1 año: +80 puntos
     * Informal: +40 puntos

   - Calidad de documentos (20%): Score según completitud y claridad
     * Todos los documentos con score >80: +150 puntos
     * Documentos completos con score >60: +120 puntos
     * Documentos básicos: +80 puntos
     * Documentos incompletos: +40 puntos

   Base mínima: 300 puntos
   Máximo posible: 300 + 300 + 200 + 150 + 150 = 1100 → normalizado a 850

2. CÁLCULO DE CAPACIDAD DE PRÉSTAMO:

   Fórmula:
   - Ingreso mensual disponible = Ingreso neto × 0.35 (35%)
   - Préstamo máximo = Ingreso disponible × plazo en meses
   - Plazo estándar: 20 años (240 meses)
   - Factor de tasa: 0.9 (ajuste por interés)

   Ejemplo: Ingreso $20,000/mes
   - Disponible: $20,000 × 0.35 = $7,000/mes
   - Préstamo: $7,000 × 240 × 0.9 = $1,512,000

3. ENGANCHE RECOMENDADO:

   Según score crediticio:
   - 750-850: 10-15% (excelente perfil)
   - 650-749: 15-20% (muy buen perfil)
   - 600-649: 20-25% (buen perfil)
   - 550-599: 25-30% (perfil regular)
   - 300-549: 30-40% (perfil de riesgo)

4. NIVEL DE RIESGO:

   - low: Score ≥700, ingresos estables, ahorro constante
   - medium: Score 550-699, ingresos regulares, ahorro moderado
   - high: Score <550, ingresos inestables, sin ahorro

FORMATO DE RESPUESTA (JSON):
{
  "internalScore": 750, // 300-850 (calculado con la metodología HAVI)
  "riskLevel": "low", // low, medium, high
  "maxLoanAmount": 1500000, // Calculado con fórmula de capacidad
  "suggestedDownPayment": 225000, // 15% del monto estimado de propiedad
  "recommendations": [
    "Recomendación específica 1",
    "Recomendación específica 2"
  ],
  "detailedAnalysis": "Análisis completo del perfil crediticio con números y justificación del score",
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "weaknesses": ["Debilidad 1", "Debilidad 2"]
}

Responde ÚNICAMENTE con el JSON, sin texto adicional.`

      const userPrompt = `SOLICITUD DE CRÉDITO HIPOTECARIO - ANÁLISIS REQUERIDO

Documentos del solicitante:
${JSON.stringify(documents, null, 2)}

INSTRUCCIONES DE ANÁLISIS:

1. IDENTIFICA los datos clave:
   - Ingreso mensual neto (de nómina o estado de cuenta)
   - Saldo bancario actual
   - Gastos mensuales promedio
   - Capacidad de ahorro (ingresos - gastos)
   - Tipo de empleo (formal/informal)
   - Antigüedad laboral

2. CALCULA el score crediticio (300-850) usando la metodología HAVI:
   - Evalúa cada factor con su peso correspondiente
   - Suma los puntos y normaliza a escala 300-850
   - Justifica el score con números específicos

3. DETERMINA la capacidad de préstamo:
   - Usa la fórmula: Ingreso mensual × 0.35 × 240 meses × 0.9
   - Ejemplo: Si ingreso es $20,000 → $20,000 × 0.35 × 240 × 0.9 = $1,512,000

4. RECOMIENDA el enganche según el score:
   - 750-850: 10-15%
   - 650-749: 15-20%
   - 600-649: 20-25%
   - 550-599: 25-30%
   - 300-549: 30-40%

5. ANALIZA strengths y weaknesses específicas con datos concretos

6. GENERA recomendaciones accionables para mejorar el perfil

IMPORTANTE:
- Usa DATOS REALES de los documentos (no inventes)
- Incluye NÚMEROS específicos en el análisis
- Sé OBJETIVO y PRECISO en la evaluación
- El detailedAnalysis debe explicar CÓMO llegaste al score

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.`

      const messages: MoonshotMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const responseText = await this.chat(messages, 0.4)

      // Parsear la respuesta JSON
      const result = this.parseCreditAnalysisResponse(responseText)

      return result
    } catch (error) {
      console.error('Error analyzing credit profile with MoonshotAI:', error)
      throw error
    }
  }

  /**
   * Parsea la respuesta del análisis crediticio
   */
  private parseCreditAnalysisResponse(responseText: string): CreditAnalysisResult {
    try {
      // Intentar extraer JSON del texto
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText

      const parsed = JSON.parse(jsonText)

      // Validar campos requeridos
      if (typeof parsed.internalScore !== 'number' || !parsed.riskLevel) {
        throw new Error('Respuesta inválida: faltan campos requeridos')
      }

      return {
        internalScore: Math.min(850, Math.max(300, parsed.internalScore)),
        riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel)
          ? parsed.riskLevel
          : 'medium',
        maxLoanAmount: parsed.maxLoanAmount || 0,
        suggestedDownPayment: parsed.suggestedDownPayment || 0,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        detailedAnalysis: parsed.detailedAnalysis || '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        moonshotAnalysis: parsed
      }
    } catch (error) {
      console.error('Error parsing credit analysis response:', error)
      console.error('Response text:', responseText)
      throw new Error('No se pudo parsear la respuesta del análisis crediticio')
    }
  }
}

export const moonshotAIService = new MoonshotAIService()
