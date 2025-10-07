// @ts-nocheck
import User from '#models/user'
import CreditScore from '#models/credit_score'
import DocumentUpload from '#models/document_upload'
import DocumentReview from '#models/document_review'
import { DateTime } from 'luxon'

interface ScoreBreakdown {
  totalScore: number
  documentScores: {
    documentType: string
    points: number
    maxPoints: number
    reason: string
  }[]
  riskLevel: 'low' | 'medium' | 'high' | 'very_high'
  maxLoanAmount: number
  estimatedIncome: number | null
}

export class CreditScoreCalculator {
  /**
   * Calcula el score crediticio de un usuario basado en sus documentos
   */
  async calculateUserScore(userId: string): Promise<ScoreBreakdown> {
    const user = await User.findOrFail(userId)

    // Obtener todos los documentos del usuario
    const documents = await DocumentUpload.query()
      .where('user_id', userId)
      .preload('review')

    let totalPoints = 0
    const documentScores: ScoreBreakdown['documentScores'] = []
    let estimatedIncome: number | null = null

    // Procesar cada documento
    for (const doc of documents) {
      const score = this.calculateDocumentScore(doc)

      if (score.points > 0) {
        totalPoints += score.points
        documentScores.push(score)
      }

      // Extraer ingreso estimado si está disponible
      if (doc.extractedData && typeof doc.extractedData === 'object') {
        const income = this.extractIncome(doc.extractedData)
        if (income && (!estimatedIncome || income > estimatedIncome)) {
          estimatedIncome = income
        }
      }
    }

    // Convertir puntos a score (300-850 como buró de crédito)
    // Máximo teórico: 7 documentos * 50 puntos promedio = 350 puntos
    // Escala: 0-350 puntos -> 300-850 score
    const creditScore = this.pointsToScore(totalPoints)

    // Determinar nivel de riesgo
    const riskLevel = this.calculateRiskLevel(creditScore, documentScores)

    // Calcular límite de crédito
    const maxLoanAmount = this.calculateMaxLoan(creditScore, estimatedIncome)

    return {
      totalScore: creditScore,
      documentScores,
      riskLevel,
      maxLoanAmount,
      estimatedIncome
    }
  }

  /**
   * Calcula los puntos de un documento individual
   */
  private calculateDocumentScore(doc: DocumentUpload): {
    documentType: string
    points: number
    maxPoints: number
    reason: string
  } {
    const docType = doc.documentTypeDescription
    let points = 0
    let reasons: string[] = []

    // Ajustar max points según tipo de documento
    const maxPoints = this.getMaxPointsForDocType(doc.documentType)

    // 1. Puntos base por tener el documento (10% del máximo)
    if (doc.status === 'processed' || doc.status === 'uploaded') {
      const basePoints = maxPoints * 0.1
      points += basePoints
      reasons.push(`Documento presente: +${Math.round(basePoints)}`)
    }

    // 2. Puntos por calidad del documento (score humano o ML)
    if (doc.review?.humanScore !== undefined && doc.review.humanScore !== null) {
      // Score humano tiene 40% del peso
      const qualityPoints = (doc.review.humanScore / 100) * (maxPoints * 0.4)
      points += qualityPoints
      reasons.push(`Calificación manual ${doc.review.humanScore}%: +${Math.round(qualityPoints)}`)
    } else if (doc.review?.confidenceScore !== undefined && doc.review.confidenceScore !== null) {
      // Confidence ML tiene 30% del peso
      const confidencePoints = (doc.review.confidenceScore / 100) * (maxPoints * 0.3)
      points += confidencePoints
      reasons.push(`Confianza ML ${doc.review.confidenceScore}%: +${Math.round(confidencePoints)}`)
    }

    // 3. Puntos por contenido específico del documento (50% del peso)
    if (doc.extractedData && typeof doc.extractedData === 'object') {
      const contentPoints = this.calculateContentPoints(doc.documentType, doc.extractedData, maxPoints)
      points += contentPoints.points
      if (contentPoints.reason) {
        reasons.push(contentPoints.reason)
      }
    }

    // Los puntos no pueden exceder maxPoints
    points = Math.min(points, maxPoints)

    return {
      documentType: docType,
      points: Math.round(points),
      maxPoints,
      reason: reasons.join(' | ')
    }
  }

  /**
   * Calcula puntos basados en el contenido extraído del documento
   */
  private calculateContentPoints(
    docType: string,
    extractedData: any,
    maxPoints: number
  ): { points: number; reason: string } {
    let points = 0
    const reasons: string[] = []
    const contentWeight = maxPoints * 0.5 // 50% del peso total

    switch (docType) {
      case 'bank_statement':
        points = this.evaluateBankStatement(extractedData, contentWeight, reasons)
        break

      case 'payroll':
        points = this.evaluatePayroll(extractedData, contentWeight, reasons)
        break

      case 'tax_return':
        points = this.evaluateTaxReturn(extractedData, contentWeight, reasons)
        break

      case 'id_document':
        points = this.evaluateIdDocument(extractedData, contentWeight, reasons)
        break

      case 'proof_of_address':
        points = this.evaluateProofOfAddress(extractedData, contentWeight, reasons)
        break

      case 'employment_letter':
        points = this.evaluateEmploymentLetter(extractedData, contentWeight, reasons)
        break

      default:
        points = contentWeight * 0.3 // 30% por defecto
        reasons.push('Datos básicos')
    }

    return {
      points: Math.min(points, contentWeight),
      reason: reasons.join(', ')
    }
  }

  private evaluateBankStatement(data: any, maxPoints: number, reasons: string[]): number {
    let points = 0

    // Extraer valores
    const balance = this.getNumericValue(data, ['saldo_actual', 'balance', 'saldo'])
    const income = this.getNumericValue(data, ['ingreso_mensual', 'monthly_income', 'ingresos'])
    const expenses = this.getNumericValue(data, ['gastos_mensuales', 'monthly_expenses', 'gastos'])

    // Evaluar saldo
    if (balance !== null) {
      if (balance >= 50000) {
        points += maxPoints * 0.4
        reasons.push(`Saldo excelente $${balance.toLocaleString()}`)
      } else if (balance >= 30000) {
        points += maxPoints * 0.3
        reasons.push(`Saldo bueno $${balance.toLocaleString()}`)
      } else if (balance >= 10000) {
        points += maxPoints * 0.2
        reasons.push(`Saldo regular $${balance.toLocaleString()}`)
      } else {
        points += maxPoints * 0.1
        reasons.push(`Saldo bajo $${balance.toLocaleString()}`)
      }
    }

    // Evaluar capacidad de ahorro
    if (income !== null && expenses !== null && income > 0) {
      const savingsRate = ((income - expenses) / income) * 100
      if (savingsRate >= 30) {
        points += maxPoints * 0.4
        reasons.push(`Ahorro excelente ${savingsRate.toFixed(0)}%`)
      } else if (savingsRate >= 20) {
        points += maxPoints * 0.3
        reasons.push(`Ahorro bueno ${savingsRate.toFixed(0)}%`)
      } else if (savingsRate >= 10) {
        points += maxPoints * 0.2
        reasons.push(`Ahorro regular ${savingsRate.toFixed(0)}%`)
      } else if (savingsRate >= 0) {
        points += maxPoints * 0.1
        reasons.push(`Ahorro bajo ${savingsRate.toFixed(0)}%`)
      }
    }

    // Evaluar nivel de ingresos
    if (income !== null) {
      if (income >= 30000) {
        points += maxPoints * 0.2
      } else if (income >= 20000) {
        points += maxPoints * 0.15
      } else if (income >= 10000) {
        points += maxPoints * 0.1
      }
    }

    return points
  }

  private evaluatePayroll(data: any, maxPoints: number, reasons: string[]): number {
    let points = 0

    const netSalary = this.getNumericValue(data, ['salario_neto', 'net_salary', 'sueldo_neto'])
    const grossSalary = this.getNumericValue(data, ['salario_bruto', 'gross_salary', 'sueldo_bruto'])

    if (netSalary !== null) {
      if (netSalary >= 25000) {
        points += maxPoints * 0.5
        reasons.push(`Salario neto excelente $${netSalary.toLocaleString()}`)
      } else if (netSalary >= 15000) {
        points += maxPoints * 0.4
        reasons.push(`Salario neto bueno $${netSalary.toLocaleString()}`)
      } else if (netSalary >= 10000) {
        points += maxPoints * 0.3
        reasons.push(`Salario neto regular $${netSalary.toLocaleString()}`)
      } else {
        points += maxPoints * 0.2
        reasons.push(`Salario neto $${netSalary.toLocaleString()}`)
      }
    }

    // Puntos adicionales si tiene prestaciones (diferencia entre bruto y neto)
    if (grossSalary !== null && netSalary !== null) {
      const deductions = grossSalary - netSalary
      if (deductions > netSalary * 0.2) {
        points += maxPoints * 0.2
        reasons.push('Con prestaciones formales')
      }
    }

    return points
  }

  private evaluateTaxReturn(data: any, maxPoints: number, reasons: string[]): number {
    let points = 0

    const annualIncome = this.getNumericValue(data, ['ingresos_anuales', 'annual_income', 'ingresos'])
    const rfc = this.getTextValue(data, ['rfc'])

    if (annualIncome !== null) {
      const monthlyIncome = annualIncome / 12
      if (monthlyIncome >= 25000) {
        points += maxPoints * 0.5
        reasons.push(`Ingresos anuales altos`)
      } else if (monthlyIncome >= 15000) {
        points += maxPoints * 0.4
        reasons.push(`Ingresos anuales buenos`)
      } else {
        points += maxPoints * 0.3
        reasons.push(`Ingresos declarados`)
      }
    }

    if (rfc) {
      points += maxPoints * 0.2
      reasons.push('RFC válido')
    }

    return points
  }

  private evaluateIdDocument(data: any, maxPoints: number, reasons: string[]): number {
    let points = maxPoints * 0.5 // Puntos base

    const name = this.getTextValue(data, ['nombre_completo', 'name', 'nombre'])
    const birthDate = this.getTextValue(data, ['fecha_nacimiento', 'birth_date', 'nacimiento'])

    if (name) {
      points += maxPoints * 0.25
      reasons.push('Nombre extraído')
    }

    if (birthDate) {
      points += maxPoints * 0.25
      reasons.push('Fecha nacimiento válida')
    }

    return points
  }

  private evaluateProofOfAddress(data: any, maxPoints: number, reasons: string[]): number {
    let points = maxPoints * 0.5

    const address = this.getTextValue(data, ['direccion', 'address', 'domicilio'])
    const holder = this.getTextValue(data, ['titular', 'holder', 'nombre'])

    if (address) {
      points += maxPoints * 0.25
      reasons.push('Dirección extraída')
    }

    if (holder) {
      points += maxPoints * 0.25
      reasons.push('Titular identificado')
    }

    return points
  }

  private evaluateEmploymentLetter(data: any, maxPoints: number, reasons: string[]): number {
    let points = maxPoints * 0.5

    const company = this.getTextValue(data, ['empresa', 'company', 'empleador'])
    const position = this.getTextValue(data, ['puesto', 'position', 'cargo'])
    const salary = this.getNumericValue(data, ['salario', 'salary', 'sueldo'])

    if (company) {
      points += maxPoints * 0.2
      reasons.push('Empresa identificada')
    }

    if (position) {
      points += maxPoints * 0.15
      reasons.push('Puesto identificado')
    }

    if (salary !== null) {
      points += maxPoints * 0.15
      reasons.push('Salario confirmado')
    }

    return points
  }

  private getNumericValue(data: any, fields: string[]): number | null {
    for (const field of fields) {
      if (data[field]) {
        const value = typeof data[field] === 'object' ? data[field].value : data[field]
        const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
        if (!isNaN(num)) return num
      }
    }
    return null
  }

  private getTextValue(data: any, fields: string[]): string | null {
    for (const field of fields) {
      if (data[field]) {
        const value = typeof data[field] === 'object' ? data[field].value : data[field]
        if (value && String(value).trim().length > 0) return String(value).trim()
      }
    }
    return null
  }

  /**
   * Puntos máximos por tipo de documento
   */
  private getMaxPointsForDocType(docType: string): number {
    const weights: Record<string, number> = {
      'bank_statement': 60,      // El más importante
      'payroll': 55,             // Muy importante
      'tax_return': 50,          // Importante
      'employment_letter': 45,   // Importante
      'id_document': 30,         // Necesario pero menos peso
      'proof_of_address': 25,    // Necesario pero menos peso
      'other': 20
    }
    return weights[docType] || 30
  }

  /**
   * Extrae el ingreso de los datos extraídos
   */
  private extractIncome(extractedData: any): number | null {
    // Buscar campos de ingreso
    const incomeFields = [
      'ingreso_mensual',
      'monthly_income',
      'salario_neto',
      'salary',
      'sueldo'
    ]

    for (const field of incomeFields) {
      if (extractedData[field]) {
        const value = typeof extractedData[field] === 'object'
          ? extractedData[field].value
          : extractedData[field]

        const income = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
        if (!isNaN(income) && income > 0) {
          return income
        }
      }
    }

    return null
  }

  /**
   * Convierte puntos a score crediticio (300-850)
   */
  private pointsToScore(points: number): number {
    // Máximo teórico: 7 documentos * 60 puntos = 420 puntos
    // Escala lineal: 0 puntos = 300, 420 puntos = 850
    const minScore = 300
    const maxScore = 850
    const maxPoints = 420

    const normalizedPoints = Math.min(points, maxPoints)
    const score = minScore + (normalizedPoints / maxPoints) * (maxScore - minScore)

    return Math.round(score)
  }

  /**
   * Calcula el nivel de riesgo
   */
  private calculateRiskLevel(
    score: number,
    documentScores: ScoreBreakdown['documentScores']
  ): 'low' | 'medium' | 'high' | 'very_high' {
    // Contar documentos con baja calificación
    const lowScoreDocs = documentScores.filter(d => (d.points / d.maxPoints) < 0.5).length
    const totalDocs = documentScores.length

    if (score >= 700 && lowScoreDocs === 0) return 'low'
    if (score >= 650 && lowScoreDocs <= 1) return 'low'
    if (score >= 600 && lowScoreDocs <= 2) return 'medium'
    if (score >= 550 && lowScoreDocs <= 3) return 'medium'
    if (score >= 500) return 'high'
    return 'very_high'
  }

  /**
   * Calcula el monto máximo de préstamo
   */
  private calculateMaxLoan(score: number, estimatedIncome: number | null): number {
    const baseAmount = estimatedIncome ? estimatedIncome * 0.35 : 30000

    if (score >= 750) return baseAmount * 60      // 5 años
    if (score >= 700) return baseAmount * 48      // 4 años
    if (score >= 650) return baseAmount * 36      // 3 años
    if (score >= 600) return baseAmount * 24      // 2 años
    if (score >= 550) return baseAmount * 18      // 1.5 años
    if (score >= 500) return baseAmount * 12      // 1 año
    return baseAmount * 6                         // 6 meses
  }

  /**
   * Actualiza o crea el registro de score crediticio
   */
  async updateCreditScore(userId: string): Promise<CreditScore> {
    const breakdown = await this.calculateUserScore(userId)

    // Buscar score existente
    let creditScore = await CreditScore.query()
      .where('user_id', userId)
      .where('is_active', true)
      .first()

    const scoreData = {
      userId: userId,
      creditScore: breakdown.totalScore,
      estimatedIncome: breakdown.estimatedIncome,
      maxBudget: breakdown.maxLoanAmount,
      riskLevel: breakdown.riskLevel === 'very_high' ? 'high' : breakdown.riskLevel,
      isActive: true,
      checkedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 90 }),
      notes: `Calculado automáticamente. ${breakdown.documentScores.length} documentos procesados.`
    }

    if (creditScore) {
      creditScore.merge(scoreData)
      await creditScore.save()
    } else {
      creditScore = await CreditScore.create(scoreData)
    }

    return creditScore
  }
}

// Export singleton
export const creditScoreCalculator = new CreditScoreCalculator()
