import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Blog from '#models/blog'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Buscar o crear un usuario admin para ser el autor
    const admin = await User.firstOrCreate(
      { email: 'admin@havi.com' },
      {
        firstName: 'Equipo',
        lastName: 'HAVI',
        email: 'admin@havi.com',
        password: 'admin123',
        role: 'admin'
      }
    )

    const blogs = [
      {
        title: 'Guía Completa para Comprar tu Primera Casa en México 2024',
        slug: 'guia-completa-comprar-primera-casa-mexico-2024',
        excerpt: 'Todo lo que necesitas saber para comprar tu primera propiedad en México: desde el crédito hipotecario hasta los trámites legales.',
        content: 'Contenido completo del blog sobre compra de primera casa...',
        featuredImage: '/images/blog/blog-1.jpg',
        category: 'Compra',
        tags: ['primera casa', 'crédito hipotecario', 'infonavit', 'guía'],
        readingTime: 8,
        publishedAt: DateTime.now().minus({ days: 3 })
      },
      {
        title: 'Las 5 Mejores Zonas para Invertir en Bienes Raíces en 2024',
        slug: 'mejores-zonas-invertir-bienes-raices-2024',
        excerpt: 'Descubre las áreas con mayor potencial de plusvalía y rendimiento para tu inversión inmobiliaria este año.',
        content: 'Contenido completo sobre las mejores zonas de inversión...',
        featuredImage: '/images/blog/blog-2.jpg',
        category: 'Inversión',
        tags: ['inversión', 'plusvalía', 'bienes raíces', 'ROI'],
        readingTime: 6,
        publishedAt: DateTime.now().minus({ days: 7 })
      },
      {
        title: 'Tendencias del Mercado Inmobiliario Mexicano: Qué Esperar en 2024',
        slug: 'tendencias-mercado-inmobiliario-mexicano-2024',
        excerpt: 'Análisis profundo de las tendencias que están transformando el sector inmobiliario en México y las oportunidades que presentan.',
        content: 'Contenido completo sobre tendencias del mercado inmobiliario...',
        featuredImage: '/images/blog/blog-3.jpg',
        category: 'Mercado',
        tags: ['tendencias', 'mercado inmobiliario', 'tecnología', 'sustentabilidad'],
        readingTime: 10,
        publishedAt: DateTime.now().minus({ days: 1 })
      }
    ]

    for (const blogData of blogs) {
      await Blog.create({
        ...blogData,
        authorId: admin.id,
        isPublished: true,
        viewsCount: Math.floor(Math.random() * 500) + 100
      })
    }
  }
}