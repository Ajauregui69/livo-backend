import vine from '@vinejs/vine'

/**
 * Validator to validate the payload when creating
 * a new agency
 */
export const createAgencyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    logo: vine.string().url().optional(),
    description: vine.string().trim().minLength(10).maxLength(1000).optional(),
    email: vine.string().email().optional(),
    phone: vine.string().trim().minLength(10).maxLength(20).optional(),
    website: vine.string().url().optional(),
    address: vine.string().trim().maxLength(200).optional(),
    city: vine.string().trim().maxLength(50).optional(),
    state: vine.string().trim().maxLength(50).optional(),
    zipCode: vine.string().trim().maxLength(10).optional(),
    socialMedia: vine.object({
      facebook: vine.string().url().optional(),
      instagram: vine.string().url().optional(),
      twitter: vine.string().url().optional(),
      linkedin: vine.string().url().optional(),
      youtube: vine.string().url().optional(),
      whatsapp: vine.string().optional(),
      telegram: vine.string().optional()
    }).optional()
  })
)

/**
 * Validator to validate the payload when updating
 * an existing agency
 */
export const updateAgencyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    logo: vine.string().url().optional(),
    description: vine.string().trim().minLength(10).maxLength(1000).optional(),
    email: vine.string().email().optional(),
    phone: vine.string().trim().minLength(10).maxLength(20).optional(),
    website: vine.string().url().optional(),
    address: vine.string().trim().maxLength(200).optional(),
    city: vine.string().trim().maxLength(50).optional(),
    state: vine.string().trim().maxLength(50).optional(),
    zipCode: vine.string().trim().maxLength(10).optional(),
    socialMedia: vine.object({
      facebook: vine.string().url().optional(),
      instagram: vine.string().url().optional(),
      twitter: vine.string().url().optional(),
      linkedin: vine.string().url().optional(),
      youtube: vine.string().url().optional(),
      whatsapp: vine.string().optional(),
      telegram: vine.string().optional()
    }).optional()
  })
)