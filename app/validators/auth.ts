import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().minLength(2).maxLength(50),
    lastName: vine.string().trim().minLength(2).maxLength(50),
    email: vine.string().email().normalizeEmail().unique(async (db, value) => {
      const user = await db.from('users').where('email', value).first()
      return !user
    }),
    phone: vine.string().optional(),
    password: vine.string().minLength(8),
    role: vine.enum(['agent', 'broker', 'developer', 'comprador', 'admin', 'agency_admin']).optional(),
    companyName: vine.string().maxLength(100).optional(),
    licenseNumber: vine.string().maxLength(50).optional()
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string()
  })
)