// @ts-nocheck
import User from '#models/user'
import DocumentUpload from '#models/document_upload'
import DocumentField from '#models/document_field'
import CreditAnalysis from '#models/credit_analysis'
import { DateTime } from 'luxon'

interface ScoringFactors {
  income: number
  employmentStability: number
  bankingHistory: number
  debtLevel: number
}

interface CreditScoreResult {
  internalScore: number
  riskLevel: 'low' | 'medium' | 'high'
  maxLoanAmount: number
  suggestedDownPayment: number
  recommendations: string[]
  scoringFactors: ScoringFactors
  analysisDetails: Record<string, any>
}

class CreditScoringService {
  /**
   * Calcula el score crediticio basado en documentos procesados
   */
  async calculateCreditScore(userId: string): Promise<CreditScoreResult> {
    // 1. Obtener todos los documentos procesados del usuario
    const documents = await DocumentUpload.query()
      .where('user_id', userId)
      .where('status', 'processed')
      .preload('user')

    if (documents.length === 0) {
      throw new Error('No hay documentos procesados para analizar')
    }

    // 2. Obtener todos los campos extraídos
    const documentIds = documents.map(d => d.id)
    const fields = await DocumentField.query()
      .whereIn('document_upload_id', documentIds)

    // 3. Calcular factores de scoring
    const scoringFactors = this.calculateScoringFactors(fields, documents)

    // 4. Calcular score final (0-1000)
    const internalScore = this.calculateFinalScore(scoringFactors)

    // 5. Determinar nivel de riesgo
    const riskLevel = this.determineRiskLevel(internalScore)

    // 6. Calcular capacidad de préstamo
    const { maxLoanAmount, suggestedDownPayment } = this.calculateLoanCapacity(
      internalScore,
      scoringFactors,
      fields
    )

    // 7. Generar recomendaciones
    const recommendations = this.generateRecommendations(scoringFactors, internalScore, fields)

    // 8. Detalles del análisis
    const analysisDetails = {
      documentsAnalyzed: documents.length,
      fieldsExtracted: fields.length,
      scoringFactors,
      calculatedAt: DateTime.now().toISO()
    }

    return {
      internalScore,
      riskLevel,
      maxLoanAmount,
      suggestedDownPayment,
      recommendations,
      scoringFactors,
      analysisDetails
    }
  }

  /**
   * Calcula los factores de scoring
   */
  private calculateScoringFactors(
    fields: DocumentField[],
    documents: DocumentUpload[]
  ): ScoringFactors {
    // Factor 1: Ingresos (40% del score)
    const incomeScore = this.calculateIncomeScore(fields)

    // Factor 2: Estabilidad laboral (25% del score)
    const employmentScore = this.calculateEmploymentScore(fields)

    // Factor 3: Historial bancario (20% del score)
    const bankingScore = this.calculateBankingScore(fields)

    // Factor 4: Nivel de endeudamiento (15% del score)
    const debtScore = this.calculateDebtScore(fields)

    return {
      income: incomeScore,
      employmentStability: employmentScore,
      bankingHistory: bankingScore,
      debtLevel: debtScore
    }
  }

  /**
   * Calcula score de ingresos (0-100)
   */
  private calculateIncomeScore(fields: DocumentField[]): number {
    const monthlyIncome = this.getFieldValue(fields, 'monthly_income')
    const annualIncome = this.getFieldValue(fields, 'annual_income')

    let income = monthlyIncome || (annualIncome ? annualIncome / 12 : 0)

    if (income === 0) return 0

    // Scoring basado en rangos de ingreso mensual
    if (income >= 50000) return 100
    if (income >= 30000) return 90
    if (income >= 20000) return 75
    if (income >= 15000) return 60
    if (income >= 10000) return 40
    return 20
  }

  /**
   * Calcula score de estabilidad laboral (0-100)
   */
  private calculateEmploymentScore(fields: DocumentField[]): number {
    const employmentStartDate = this.getFieldValue(fields, 'employment_start_date')
    const employerName = this.getFieldValue(fields, 'employer_name')

    let score = 50 // Base score

    // Bonus si tiene empleador
    if (employerName) {
      score += 20
    }

    // Bonus basado en antigüedad
    if (employmentStartDate) {
      try {
        const startDate = new Date(employmentStartDate)
        const yearsEmployed = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365)

        if (yearsEmployed >= 5) score += 30
        else if (yearsEmployed >= 3) score += 20
        else if (yearsEmployed >= 1) score += 10
      } catch (error) {
        console.error('Error parsing employment date:', error)
      }
    }

    return Math.min(score, 100)
  }

  /**
   * Calcula score de historial bancario (0-100)
   */
  private calculateBankingScore(fields: DocumentField[]): number {
    const bankBalance = this.getFieldValue(fields, 'bank_balance')
    const averageBalance = this.getFieldValue(fields, 'average_balance')
    const overdraftCount = this.getFieldValue(fields, 'overdraft_count')

    let score = 50 // Base score

    // Score basado en saldo
    const balance = averageBalance || bankBalance || 0
    if (balance >= 100000) score += 30
    else if (balance >= 50000) score += 20
    else if (balance >= 20000) score += 10
    else if (balance < 5000) score -= 10

    // Penalización por sobregiros
    if (overdraftCount) {
      const overdrafts = parseInt(String(overdraftCount))
      if (overdrafts > 5) score -= 30
      else if (overdrafts > 2) score -= 15
      else if (overdrafts > 0) score -= 5
    }

    return Math.max(Math.min(score, 100), 0)
  }

  /**
   * Calcula score de nivel de deuda (0-100)
   */
  private calculateDebtScore(fields: DocumentField[]): number {
    const monthlyIncome = this.getFieldValue(fields, 'monthly_income')
    const debtPayments = this.getFieldValue(fields, 'debt_payments')
    const monthlyExpenses = this.getFieldValue(fields, 'monthly_expenses')

    if (!monthlyIncome) return 50 // Score neutral si no hay datos

    let score = 100 // Empezar con score máximo

    // Calcular ratio deuda/ingreso (DTI)
    if (debtPayments) {
      const dti = (parseFloat(String(debtPayments)) / parseFloat(String(monthlyIncome))) * 100

      if (dti < 20) score = 100
      else if (dti < 30) score = 85
      else if (dti < 40) score = 60
      else if (dti < 50) score = 35
      else score = 10
    }

    return score
  }

  /**
   * Calcula el score final combinando todos los factores
   */
  private calculateFinalScore(factors: ScoringFactors): number {
    const weightedScore =
      factors.income * 0.40 +
      factors.employmentStability * 0.25 +
      factors.bankingHistory * 0.20 +
      factors.debtLevel * 0.15

    // Convertir de 0-100 a 0-1000
    return Math.round(weightedScore * 10)
  }

  /**
   * Determina el nivel de riesgo basado en el score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 700) return 'low'
    if (score >= 500) return 'medium'
    return 'high'
  }

  /**
   * Calcula la capacidad de préstamo
   */
  private calculateLoanCapacity(
    score: number,
    factors: ScoringFactors,
    fields: DocumentField[]
  ): { maxLoanAmount: number; suggestedDownPayment: number } {
    const monthlyIncome = this.getFieldValue(fields, 'monthly_income') || 0

    if (monthlyIncome === 0) {
      return { maxLoanAmount: 0, suggestedDownPayment: 0 }
    }

    // Calcular capacidad de pago mensual (30% del ingreso)
    const monthlyPaymentCapacity = monthlyIncome * 0.30

    // Multiplicador basado en score
    let multiplier = 36 // 3 años base

    if (score >= 800) multiplier = 60 // 5 años
    else if (score >= 700) multiplier = 48 // 4 años
    else if (score >= 600) multiplier = 36 // 3 años
    else if (score >= 500) multiplier = 24 // 2 años
    else multiplier = 12 // 1 año

    const maxLoanAmount = Math.round(monthlyPaymentCapacity * multiplier)

    // Enganche sugerido basado en riesgo
    let downPaymentPercentage = 0.20 // 20% default

    if (score >= 800) downPaymentPercentage = 0.10
    else if (score >= 700) downPaymentPercentage = 0.15
    else if (score >= 600) downPaymentPercentage = 0.20
    else if (score >= 500) downPaymentPercentage = 0.30
    else downPaymentPercentage = 0.40

    const suggestedDownPayment = Math.round(maxLoanAmount * downPaymentPercentage)

    return { maxLoanAmount, suggestedDownPayment }
  }

  /**
   * Genera recomendaciones personalizadas
   */
  private generateRecommendations(
    factors: ScoringFactors,
    score: number,
    fields: DocumentField[]
  ): string[] {
    const recommendations: string[] = []

    // Recomendaciones basadas en ingresos
    if (factors.income < 60) {
      recommendations.push('Considera aumentar tus ingresos o agregar un co-deudor para mejorar tu capacidad de crédito.')
    }

    // Recomendaciones de estabilidad laboral
    if (factors.employmentStability < 70) {
      recommendations.push('Mantén tu empleo actual para demostrar estabilidad laboral y mejorar tu perfil crediticio.')
    }

    // Recomendaciones de historial bancario
    if (factors.bankingHistory < 60) {
      recommendations.push('Mantén un saldo saludable en tu cuenta bancaria y evita sobregiros.')
    }

    // Recomendaciones de deuda
    if (factors.debtLevel < 60) {
      recommendations.push('Reduce tus deudas actuales para mejorar tu capacidad de pago.')
    }

    // Recomendación general basada en score
    if (score >= 700) {
      recommendations.push('¡Excelente perfil crediticio! Calificas para las mejores tasas de interés.')
    } else if (score >= 500) {
      recommendations.push('Buen perfil crediticio. Sigue trabajando en mejorar tus finanzas para obtener mejores condiciones.')
    } else {
      recommendations.push('Te recomendamos trabajar en mejorar tu perfil crediticio antes de solicitar un préstamo grande.')
    }

    return recommendations
  }

  /**
   * Obtiene el valor de un campo específico
   */
  private getFieldValue(fields: DocumentField[], fieldName: string): number | string | null {
    const field = fields.find(f => f.fieldName === fieldName)
    if (!field) return null

    const value = field.finalValue
    if (!value) return null

    // Intentar convertir a número si es posible
    if (field.fieldType === 'number' || field.fieldType === 'currency') {
      // Limpiar formato de moneda y convertir
      const cleaned = value.replace(/[^0-9.-]/g, '')
      const num = parseFloat(cleaned)
      return isNaN(num) ? null : num
    }

    return value
  }

  /**
   * Crea o actualiza el análisis de crédito del usuario
   */
  async createCreditAnalysis(userId: string): Promise<CreditAnalysis> {
    const scoreResult = await this.calculateCreditScore(userId)

    // Verificar si ya existe un análisis reciente
    const existingAnalysis = await CreditAnalysis.query()
      .where('user_id', userId)
      .where('status', 'completed')
      .orderBy('created_at', 'desc')
      .first()

    // Si existe uno reciente (menos de 30 días), actualizarlo en lugar de crear uno nuevo
    if (existingAnalysis && existingAnalysis.createdAt > DateTime.now().minus({ days: 30 })) {
      existingAnalysis.internalScore = scoreResult.internalScore
      existingAnalysis.riskLevel = scoreResult.riskLevel
      existingAnalysis.maxLoanAmount = scoreResult.maxLoanAmount
      existingAnalysis.suggestedDownPayment = scoreResult.suggestedDownPayment
      existingAnalysis.recommendations = scoreResult.recommendations.join('\n')
      existingAnalysis.analysisDetails = scoreResult.analysisDetails
      existingAnalysis.processedAt = DateTime.now()
      await existingAnalysis.save()
      return existingAnalysis
    }

    // Crear nuevo análisis
    const analysis = await CreditAnalysis.create({
      userId,
      internalScore: scoreResult.internalScore,
      riskLevel: scoreResult.riskLevel,
      maxLoanAmount: scoreResult.maxLoanAmount,
      suggestedDownPayment: scoreResult.suggestedDownPayment,
      recommendations: scoreResult.recommendations.join('\n'),
      status: 'completed',
      analysisDetails: scoreResult.analysisDetails,
      processedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 30 })
    })

    return analysis
  }
}

export const creditScoringService = new CreditScoringService()
