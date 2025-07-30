import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // First, create agents table if it doesn't exist
    const hasAgentsTable = await this.schema.hasTable('agents')
    
    if (!hasAgentsTable) {
      this.schema.createTable('agents', (table) => {
        table.string('id').primary()
        
        // Basic Info
        table.string('name').notNullable()
        table.string('email').nullable()
        table.string('image').nullable()
        table.string('city').nullable()
        table.string('category').nullable() // Specialization
        
        // Company Info
        table.string('company').nullable()
        table.string('broker_address').nullable()
        
        // Contact Info
        table.string('phone_1').nullable()
        table.string('phone_2').nullable()
        table.string('office_phone').nullable()
        table.string('mobile_phone').nullable()
        table.string('fax').nullable()
        table.string('website').nullable()
        
        // Professional Info
        table.date('member_since').nullable()
        table.decimal('rating', 3, 2).nullable().defaultTo(0) // 0.00 to 5.00
        table.integer('reviews_count').defaultTo(0)
        table.text('bio').nullable()
        
        // Social Media (JSON)
        table.json('social_media').nullable()
        
        // Status
        table.boolean('is_active').defaultTo(true)
        
        table.timestamp('created_at')
        table.timestamp('updated_at')
      })
    }

    // Then, add agent_id column to properties if it doesn't exist
    const hasAgentIdColumn = await this.schema.hasColumn('properties', 'agent_id')
    
    if (!hasAgentIdColumn) {
      this.schema.alterTable('properties', (table) => {
        table.string('agent_id').nullable().defaultTo(null)
      })
    }

    // Add foreign key constraint if agents table exists and column exists
    if (hasAgentsTable || !hasAgentsTable) {
      // Wait for agents table to be created first
      await new Promise(resolve => setTimeout(resolve, 100))
      
      this.schema.alterTable('properties', (table) => {
        // Drop existing constraint if it exists
        try {
          table.dropForeign(['agent_id'])
        } catch (e) {
          // Ignore error if constraint doesn't exist
        }
        
        // Add the foreign key constraint
        table.foreign('agent_id').references('agents.id').onDelete('SET NULL')
      })
    }
  }

  async down() {
    // Remove foreign key constraint
    this.schema.alterTable('properties', (table) => {
      try {
        table.dropForeign(['agent_id'])
      } catch (e) {
        // Ignore error if constraint doesn't exist
      }
      table.dropColumn('agent_id')
    })

    // Drop agents table
    this.schema.dropTableIfExists('agents')
  }
}