import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'properties'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
      
      // Property Description fields
      table.string('title').notNullable()
      table.text('description')
      table.json('categories') // For multiple categories
      table.string('listing_status').defaultTo('active') // active, sold, processing
      table.string('property_status').defaultTo('pending') // pending, processing, published
      table.decimal('price', 12, 2)
      table.decimal('yearly_tax_rate', 8, 2).nullable()
      table.string('after_price_label').nullable()
      
      // Location fields
      table.string('address')
      table.string('city').nullable()
      table.string('state').nullable()
      table.string('country').nullable()
      table.string('zip').nullable()
      table.string('neighborhood').nullable()
      table.decimal('latitude', 10, 8).nullable()
      table.decimal('longitude', 11, 8).nullable()
      
      // Details fields
      table.integer('size_sqft').nullable() // Size in ft
      table.integer('lot_size_sqft').nullable() // Lot size in ft
      table.integer('rooms').nullable()
      table.integer('bedrooms').nullable()
      table.integer('bathrooms').nullable()
      table.string('custom_id').nullable()
      table.integer('garages').nullable()
      table.string('garage_size').nullable()
      table.integer('year_built').nullable()
      table.date('available_from').nullable()
      table.string('basement').nullable()
      table.text('extra_details').nullable()
      table.string('roofing').nullable()
      table.string('exterior_material').nullable()
      table.string('structure_type').nullable()
      table.text('owner_notes').nullable() // Not visible on frontend
      
      // Amenities - stored as JSON array
      table.json('amenities').nullable()
      
      // Media fields
      table.json('images').nullable() // Array of image URLs
      table.json('videos').nullable() // Array of video URLs
      table.string('virtual_tour_url').nullable()
      
      // Additional fields
      table.boolean('is_featured').defaultTo(false)
      table.integer('views_count').defaultTo(0)
      table.string('mls_number').nullable()
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}