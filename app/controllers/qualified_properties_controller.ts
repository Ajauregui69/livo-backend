// @ts-nocheck
import type { HttpContext } from '@adonisjs/core/http'
import Property from '#models/property'
import User from '#models/user'
import CreditScore from '#models/credit_score'

export default class QualifiedPropertiesController {
  /**
   * Get properties that the authenticated user can afford based on their credit score
   */
  async index({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      
      // Get user's current credit score
      const creditScore = await user.getCurrentCreditScore()
      
      if (!creditScore) {
        return response.status(400).json({
          message: 'No tienes un score crediticio. Completa tu evaluación crediticia primero.',
          requiresCreditCheck: true
        })
      }

      // Base query for active properties
      let query = Property.query()
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets')
        .preload('agent')

      // Filter by budget if user has credit score
      if (creditScore.maxBudget) {
        query = query.where('price', '<=', creditScore.maxBudget)
      }

      // Additional filters based on risk level
      if (creditScore.riskLevel === 'high') {
        // For high risk users, only show properties with financing options
        // or lower price range
        query = query.where((subQuery) => {
          subQuery
            .where('price', '<=', creditScore.maxBudget! * 0.8) // 80% of max budget
            .orWhereNotNull('financing_options') // If you have this field
        })
      }

      // Apply other filters from request
      const filters = request.only([
        'city', 'state', 'listingType', 'bedrooms', 'bathrooms',
        'minPrice', 'maxPrice', 'propertyType'
      ])

      if (filters.city) {
        query = query.whereILike('city', `%${filters.city}%`)
      }

      if (filters.state) {
        query = query.whereILike('state', `%${filters.state}%`)
      }

      if (filters.listingType) {
        query = query.where('listing_type', filters.listingType)
      }

      if (filters.bedrooms) {
        query = query.where('bedrooms', '>=', filters.bedrooms)
      }

      if (filters.bathrooms) {
        query = query.where('bathrooms', '>=', filters.bathrooms)
      }

      // Override price filters with credit score limits
      const minPrice = filters.minPrice || 0
      const maxPrice = Math.min(
        filters.maxPrice || creditScore.maxBudget!, 
        creditScore.maxBudget!
      )

      query = query.whereBetween('price', [minPrice, maxPrice])

      // Execute paginated query
      const properties = await query.paginate(page, limit)

      return response.json({
        ...properties.serialize(),
        creditInfo: {
          creditScore: creditScore.creditScore,
          scoreDescription: creditScore.scoreDescription,
          maxBudget: creditScore.maxBudget,
          riskLevel: creditScore.riskLevel,
          riskDescription: creditScore.riskDescription,
          budgetUsed: maxPrice === creditScore.maxBudget ? 100 : Math.round((maxPrice / creditScore.maxBudget!) * 100)
        }
      })

    } catch (error) {
      console.error('Error getting qualified properties:', error)
      return response.status(500).json({
        message: 'Error al obtener propiedades calificadas'
      })
    }
  }

  /**
   * Get a specific property with affordability analysis
   */
  async show({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const propertyId = params.id

      const property = await Property.query()
        .where('id', propertyId)
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets')
        .preload('agent')
        .preload('user')
        .first()

      if (!property) {
        return response.status(404).json({
          message: 'Propiedad no encontrada'
        })
      }

      // Get user's credit score
      const creditScore = await user.getCurrentCreditScore()

      let affordabilityAnalysis = null
      if (creditScore) {
        const canAfford = property.price <= (creditScore.maxBudget || 0)
        const budgetPercentage = creditScore.maxBudget 
          ? Math.round((property.price / creditScore.maxBudget) * 100)
          : 0

        affordabilityAnalysis = {
          canAfford,
          budgetPercentage,
          creditScore: creditScore.creditScore,
          scoreDescription: creditScore.scoreDescription,
          maxBudget: creditScore.maxBudget,
          riskLevel: creditScore.riskLevel,
          monthlyPaymentEstimate: this.calculateMonthlyPayment(property.price, creditScore.creditScore),
          recommendation: this.getRecommendation(canAfford, budgetPercentage, creditScore.riskLevel)
        }
      }

      return response.json({
        property: property.serialize(),
        affordabilityAnalysis,
        requiresCreditCheck: !creditScore
      })

    } catch (error) {
      console.error('Error getting property affordability:', error)
      return response.status(500).json({
        message: 'Error al analizar la propiedad'
      })
    }
  }

  /**
   * Get credit score status for current user
   */
  async creditStatus({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const creditScore = await user.getCurrentCreditScore()

      if (!creditScore) {
        return response.json({
          hasCreditScore: false,
          message: 'Completa tu evaluación crediticia para ver propiedades personalizadas'
        })
      }

      return response.json({
        hasCreditScore: true,
        creditScore: creditScore.creditScore,
        scoreDescription: creditScore.scoreDescription,
        maxBudget: creditScore.maxBudget,
        riskLevel: creditScore.riskLevel,
        riskDescription: creditScore.riskDescription,
        estimatedIncome: creditScore.estimatedIncome,
        checkedAt: creditScore.checkedAt,
        expiresAt: creditScore.expiresAt,
        isExpired: creditScore.isExpired
      })

    } catch (error) {
      console.error('Error getting credit status:', error)
      return response.status(500).json({
        message: 'Error al obtener estado crediticio'
      })
    }
  }

  /**
   * Calculate estimated monthly payment
   */
  private calculateMonthlyPayment(price: number, creditScore: number): number {
    // Simple calculation: assume 20% down payment, 30-year loan
    const downPayment = price * 0.2
    const loanAmount = price - downPayment
    
    // Interest rate based on credit score
    let interestRate = 0.12 // 12% default
    if (creditScore >= 700) interestRate = 0.08 // 8%
    else if (creditScore >= 650) interestRate = 0.09 // 9%
    else if (creditScore >= 600) interestRate = 0.10 // 10%
    else if (creditScore >= 550) interestRate = 0.11 // 11%

    const monthlyRate = interestRate / 12
    const numberOfPayments = 30 * 12 // 30 years

    // Monthly payment formula
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

    return Math.round(monthlyPayment)
  }

  /**
   * Get recommendation based on affordability
   */
  private getRecommendation(canAfford: boolean, budgetPercentage: number, riskLevel: string): string {
    if (!canAfford) {
      return 'Esta propiedad excede tu presupuesto. Te recomendamos buscar opciones más económicas.'
    }

    if (budgetPercentage <= 60) {
      return '¡Excelente opción! Esta propiedad está muy dentro de tu presupuesto.'
    }

    if (budgetPercentage <= 80) {
      return 'Buena opción. Esta propiedad se ajusta bien a tu presupuesto.'
    }

    if (budgetPercentage <= 95) {
      if (riskLevel === 'high') {
        return 'Esta propiedad usa casi todo tu presupuesto. Considera opciones más económicas.'
      }
      return 'Esta propiedad está en el límite de tu presupuesto. Evalúa cuidadosamente.'
    }

    return 'Esta propiedad usa tu presupuesto completo. Te recomendamos considerar opciones más económicas.'
  }
}