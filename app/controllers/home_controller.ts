import type { HttpContext } from '@adonisjs/core/http'
import Property from '#models/property'
import Agency from '#models/agency'
import Agent from '#models/agent'
import Review from '#models/review'
import Blog from '#models/blog'

export default class HomeController {
  async index({ response }: HttpContext) {
    try {
      // Obtener estadísticas básicas primero
      const totalProperties = await Property.query().count('* as total')
      const totalAgencies = await Agency.query().count('* as total')
      const totalAgents = await Agent.query().count('* as total')

      // Obtener propiedades destacadas (máximo 6)
      const featuredProperties = await Property.query()
        .where('is_featured', true)
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets')
        .preload('agent')
        .limit(6)

      // Obtener conteos por ciudad
      const cityCounts = await Property.query()
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .groupBy('city')
        .select('city')
        .count('* as total')
        .orderBy('total', 'desc')
        .limit(10)

      // Obtener propiedades populares por tipo
      const popularForRent = await Property.query()
        .where('listing_type', 'rent')
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets')
        .preload('agent')
        .orderBy('views_count', 'desc')
        .limit(6)

      const popularForSale = await Property.query()
        .where('listing_type', 'sale')
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets')
        .preload('agent')
        .orderBy('views_count', 'desc')
        .limit(6)

      const popularR2O = await Property.query()
        .where('listing_type', 'R2O')
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets')
        .preload('agent')
        .orderBy('views_count', 'desc')
        .limit(6)

      // Obtener mejores reviews de agentes (aprobados, con rating alto)
      const topReviews = await Review.query()
        .where('is_approved', true)
        .where('rating', '>=', 4)
        .preload('user', (userQuery) => {
          userQuery.select('id', 'fullName', 'image')
        })
        .preload('agent', (agentQuery) => {
          agentQuery.select('id', 'image').preload('user', (userQuery) => {
            userQuery.select('id', 'fullName')
          })
        })
        .orderBy('rating', 'desc')
        .orderBy('created_at', 'desc')
        .limit(6)

      // Obtener blogs más recientes para el home (con manejo de errores)
      let recentBlogs = []
      try {
        recentBlogs = await Blog.query()
          .where('is_published', true)
          .preload('author', (authorQuery) => {
            authorQuery.select('id', 'firstName', 'lastName', 'image')
          })
          .orderBy('published_at', 'desc')
          .orderBy('created_at', 'desc')
          .limit(3)
      } catch (blogError) {
        console.log('Error fetching blogs:', blogError)
        recentBlogs = []
      }

      const stats = {
        totalProperties: Number(totalProperties[0].$extras.total) || 0,
        totalAgencies: Number(totalAgencies[0].$extras.total) || 0,
        totalAgents: Number(totalAgents[0].$extras.total) || 0
      }

      const propertyTypes = [
        { id: 1, icon: "flaticon-home", title: "Casas", count: Math.floor(stats.totalProperties * 0.4) },
        { id: 2, icon: "flaticon-corporation", title: "Departamentos", count: Math.floor(stats.totalProperties * 0.3) },
        { id: 3, icon: "flaticon-network", title: "Oficinas", count: Math.floor(stats.totalProperties * 0.1) },
        { id: 4, icon: "flaticon-garden", title: "Villas", count: Math.floor(stats.totalProperties * 0.08) },
        { id: 5, icon: "flaticon-chat", title: "Townhouses", count: Math.floor(stats.totalProperties * 0.07) },
        { id: 6, icon: "flaticon-window", title: "Bungalows", count: Math.floor(stats.totalProperties * 0.03) },
        { id: 7, icon: "flaticon-bird-house", title: "Lofts", count: Math.floor(stats.totalProperties * 0.02) }
      ]

      // Mapear ciudades con datos reales o usar datos por defecto
      const cityMapping = {
        'Ciudad de México': 'ciudad-de-mexico',
        'Guadalajara': 'guadalajara',
        'Monterrey': 'monterrey',
        'Querétaro': 'queretaro',
        'Playa del Carmen': 'playa-del-carmen',
        'Cancún': 'cancun',
        'Puebla': 'puebla',
        'Mérida': 'merida'
      }

      const defaultCities = [
        { id: 1, name: "Ciudad de México", image: "/images/listings/city-listing-1.png", propertyCount: 0, slug: 'ciudad-de-mexico' },
        { id: 2, name: "Guadalajara", image: "/images/listings/city-listing-2.png", propertyCount: 0, slug: 'guadalajara' },
        { id: 3, name: "Monterrey", image: "/images/listings/city-listing-3.png", propertyCount: 0, slug: 'monterrey' },
        { id: 4, name: "Querétaro", image: "/images/listings/city-listing-4.png", propertyCount: 0, slug: 'queretaro' },
        { id: 5, name: "Playa del Carmen", image: "/images/listings/city-listing-5.png", propertyCount: 0, slug: 'playa-del-carmen' },
        { id: 6, name: "Cancún", image: "/images/listings/cancun.jpg", propertyCount: 0, slug: 'cancun' }
      ]

      // Actualizar conteos reales si existen
      const citiesWithRealCounts = defaultCities.map(city => {
        const realCount = cityCounts.find(c => c.city?.toLowerCase() === city.name.toLowerCase())
        return {
          ...city,
          propertyCount: realCount ? Number(realCount.$extras.total) : 0
        }
      })

      return response.ok({
        success: true,
        data: {
          stats,
          propertyTypes,
          featuredProperties: featuredProperties.length > 0 ? featuredProperties : [],
          featuredMessage: featuredProperties.length > 0
            ? "Descubre nuestras propiedades destacadas"
            : "Pronto habrá casas enlistadas. ¡Mantente atento!",
          citiesByProperties: citiesWithRealCounts,
          popularProperties: {
            rent: popularForRent,
            sale: popularForSale,
            R2O: popularR2O
          },
          topReviews: topReviews,
          recentBlogs: recentBlogs,
          message: stats.totalProperties > 0
            ? `Contamos con más de ${stats.totalProperties.toLocaleString()} propiedades disponibles`
            : `Próximamente tendremos propiedades disponibles`
        }
      })

    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error al obtener estadísticas'
      })
    }
  }
}