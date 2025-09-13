import vine from '@vinejs/vine'

export const updateProfileValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(50).optional(),
    lastName: vine.string().trim().minLength(1).maxLength(50).optional(),
    phone: vine.string().trim().maxLength(20).optional().nullable(),
    companyName: vine.string().trim().maxLength(100).optional().nullable(),
    licenseNumber: vine.string().trim().maxLength(50).optional().nullable(),
    monthlyIncome: vine.number().positive().optional().nullable(),
    employment: vine.enum(['empleado', 'independiente', 'empresario', 'pensionado']).optional().nullable(),
    workYears: vine.enum(['0-1', '1-3', '3-5', '5-10', '10+']).optional().nullable(),
    address: vine.string().trim().maxLength(255).optional().nullable(),
    city: vine.string().trim().maxLength(100).optional().nullable(),
    state: vine.string().trim().maxLength(100).optional().nullable(),
    zipCode: vine.string().trim().maxLength(10).optional().nullable(),
    preferences: vine.object({}).optional().nullable()
  })
)