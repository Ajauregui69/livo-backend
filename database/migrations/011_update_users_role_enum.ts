import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Drop the constraint and recreate it with the new values
    this.schema.raw(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('agent', 'broker', 'developer', 'comprador', 'admin', 'agency_admin'));
    `)
  }

  async down() {
    // Revert to original constraint
    this.schema.raw(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('agent', 'broker', 'developer', 'comprador', 'admin'));
    `)
  }
}