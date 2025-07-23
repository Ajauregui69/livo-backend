/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Health check
router.get('/', async () => {
  return {
    message: 'LIVO Backend API v1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  }
})

// Authentication routes
router.group(() => {
  router.post('/register', '#controllers/auth_controller.register')
  router.post('/login', '#controllers/auth_controller.login')
  
  // Protected routes
  router.group(() => {
    router.get('/me', '#controllers/auth_controller.me')
    router.put('/profile', '#controllers/auth_controller.updateProfile')
    router.post('/logout', '#controllers/auth_controller.logout')
  }).use(middleware.auth())
  
}).prefix('/api/auth')

// Property routes
router.group(() => {
  // Public routes (no auth required)
  router.get('/properties', '#controllers/properties_controller.index')
  router.get('/properties/search', '#controllers/properties_controller.search')
  router.get('/properties/:id', '#controllers/properties_controller.show')
  
  // Protected routes (auth required)
  router.group(() => {
    router.post('/properties/test', '#controllers/properties_controller.test')
    router.post('/properties', '#controllers/properties_controller.store')
    router.put('/properties/:id', '#controllers/properties_controller.update')
    router.delete('/properties/:id', '#controllers/properties_controller.destroy')
    router.get('/my-properties', '#controllers/properties_controller.myProperties')
    router.post('/upload', '#controllers/assets_controller.uploadMedia')
  }).use(middleware.auth())
  
}).prefix('/api')
