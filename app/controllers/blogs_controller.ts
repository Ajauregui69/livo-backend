import type { HttpContext } from '@adonisjs/core/http'
import Blog from '#models/blog'

export default class BlogsController {
  async show({ params, response }: HttpContext) {
    try {
      const blog = await Blog.query()
        .where('slug', params.slug)
        .where('is_published', true)
        .preload('author', (authorQuery) => {
          authorQuery.select('id', 'firstName', 'lastName', 'image')
        })
        .first()

      if (!blog) {
        return response.notFound({
          success: false,
          message: 'Blog no encontrado'
        })
      }

      // Incrementar contador de vistas
      await blog.merge({ viewsCount: blog.viewsCount + 1 }).save()

      return response.ok({
        success: true,
        data: blog
      })

    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error al obtener el blog'
      })
    }
  }

  async index({ response }: HttpContext) {
    try {
      const blogs = await Blog.query()
        .where('is_published', true)
        .preload('author', (authorQuery) => {
          authorQuery.select('id', 'firstName', 'lastName', 'image')
        })
        .orderBy('published_at', 'desc')
        .orderBy('created_at', 'desc')

      return response.ok({
        success: true,
        data: blogs
      })

    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error al obtener los blogs'
      })
    }
  }
}