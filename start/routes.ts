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
    message: 'HAVI Backend API v1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  }
})

// S3 Proxy for development (avoids SSL cert issues with bucket names containing dots)
router.get('/api/s3-proxy/*', '#controllers/s3_proxy_controller.proxy')

// Authentication routes
router.group(() => {
  router.post('/register', '#controllers/auth_controller.register')
  router.post('/login', '#controllers/auth_controller.login')
  
  // Email verification routes
  router.get('/verify-email', '#controllers/auth_controller.verifyEmail')
  router.post('/resend-verification', '#controllers/auth_controller.resendVerificationEmail')
  
  // OAuth routes
  router.get('/:provider/redirect', '#controllers/auth_controller.redirect')
  router.get('/:provider/callback', '#controllers/auth_controller.callback')
  
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
  
  // Protected routes that need to come before dynamic :id routes
  router.get('/properties/drafts', '#controllers/properties_controller.getDrafts').use(middleware.auth())
  
  router.get('/properties/:id', '#controllers/properties_controller.show')
  router.get('/properties/:id/similar', '#controllers/properties_controller.similar')
  
  // Property inquiry routes - public
  router.post('/properties/:propertyId/inquiries', '#controllers/property_inquiries_controller.store')
  
  // Agent routes - public
  router.get('/agents', '#controllers/agents_controller.index')
  router.get('/agents/:id', '#controllers/agents_controller.show')

  // Contact form route - public (no auth required)
  router.post('/messages', '#controllers/messages_controller.store')
  
  // Agency routes - public
  router.get('/agencies', '#controllers/agencies_controller.index')
  router.get('/agencies/:id', '#controllers/agencies_controller.show')
  
  // Protected routes (auth required)
  router.group(() => {
    router.post('/properties/test', '#controllers/properties_controller.test')
    router.post('/properties', '#controllers/properties_controller.store')
    router.post('/properties/draft', '#controllers/properties_controller.saveDraft')
    router.put('/properties/:id', '#controllers/properties_controller.update')
    router.delete('/properties/:id', '#controllers/properties_controller.destroy')
    router.get('/my-properties', '#controllers/properties_controller.myProperties')
    router.post('/upload', '#controllers/assets_controller.uploadMedia')
    router.put('/properties/:id/assign-agent', '#controllers/properties_controller.assignAgent')
    
    // Qualified properties routes (for compradores with credit scores)
    router.get('/qualified-properties', '#controllers/qualified_properties_controller.index')
    router.get('/qualified-properties/:id', '#controllers/qualified_properties_controller.show')
    router.get('/credit-status', '#controllers/qualified_properties_controller.creditStatus')
    
    // Property inquiry management routes - protected
    router.get('/properties/:propertyId/inquiries', '#controllers/property_inquiries_controller.index')
    router.get('/my-inquiries', '#controllers/property_inquiries_controller.myInquiries')
    router.get('/inquiries/:id', '#controllers/property_inquiries_controller.show')
    router.put('/inquiries/:id/status', '#controllers/property_inquiries_controller.updateStatus')
    
    // Agent management routes - protected (admin only)
    router.post('/agents', '#controllers/agents_controller.store')
    router.put('/agents/:id', '#controllers/agents_controller.update')
    router.delete('/agents/:id', '#controllers/agents_controller.destroy')
    
    // Agency management routes - protected
    router.get('/my-agencies', '#controllers/agencies_controller.myAgencies')
    router.get('/agent/my-agency', '#controllers/agencies_controller.getAgentAgency')
    router.post('/agencies', '#controllers/agencies_controller.store')
    router.put('/agencies/:id', '#controllers/agencies_controller.update')
    router.delete('/agencies/:id', '#controllers/agencies_controller.destroy')
    router.post('/agencies/:id/logo', '#controllers/agencies_controller.uploadLogo')
    
    // Agency agents management routes - protected
    // IMPORTANT: Specific routes with "current" must come BEFORE dynamic :id routes
    router.get('/agencies/current/agents', '#controllers/agencies_controller.getCurrentAgencyAgents')
    router.post('/agencies/current/agents', '#controllers/agencies_controller.createCurrentAgencyAgent')
    router.post('/agencies/current/sync-agents', '#controllers/agencies_controller.syncAgentsWithUsers')
    router.get('/agencies/:id/agents', '#controllers/agencies_controller.getAgents')
    router.post('/agencies/:id/agents', '#controllers/agencies_controller.createAgent')

    // Messages routes - protected
    router.get('/messages', '#controllers/messages_controller.index')
    router.get('/messages/:id', '#controllers/messages_controller.show')
    router.put('/messages/:id/status', '#controllers/messages_controller.updateStatus')

  }).use(middleware.auth())
  
}).prefix('/api')

// Home/Statistics routes
router.get('/api/home', '#controllers/home_controller.index')

// Blog routes
router.group(() => {
  router.get('/blogs', '#controllers/blogs_controller.index')
  router.get('/blogs/:slug', '#controllers/blogs_controller.show')
}).prefix('/api')

// AI Analysis and Document Upload routes
router.group(() => {
  // AI Analysis routes
  router.get('/analysis', '#controllers/ai_analysis_controller.getUserAnalysis')
  router.post('/analysis/request', '#controllers/ai_analysis_controller.requestAnalysis')
  router.get('/analysis/status/:analysisId', '#controllers/ai_analysis_controller.getAnalysisStatus')
  router.get('/documents/summary', '#controllers/ai_analysis_controller.getDocumentsSummary')

  // Document upload routes
  router.post('/documents/upload', '#controllers/document_controller.upload')
  router.get('/documents', '#controllers/document_controller.getUserDocuments')
  router.delete('/documents/:documentId', '#controllers/document_controller.deleteDocument')
  router.get('/documents/:documentId/status', '#controllers/document_controller.getDocumentStatus')
  router.get('/documents/:documentId/url', '#controllers/document_controller.getDocumentUrl')
  router.post('/documents/:documentId/reprocess', '#controllers/document_controller.reprocessDocument')
  router.post('/documents/:documentId/rate', '#controllers/document_controller.rateDocument')

  // Document review routes (admin/agency_admin only)
  router.get('/reviews', '#controllers/document_review_controller.getPendingReviews')
  router.get('/reviews/stats', '#controllers/document_review_controller.getReviewStats')
  router.get('/reviews/:reviewId', '#controllers/document_review_controller.getReview')
  router.post('/reviews/:reviewId/assign', '#controllers/document_review_controller.assignReview')
  router.put('/reviews/:reviewId', '#controllers/document_review_controller.updateReview')

  // Users management for ML dashboard (admin/agency_admin only)
  router.get('/users', '#controllers/document_review_controller.getUsers')
  router.get('/users/:userId/documents', '#controllers/document_review_controller.getUserDocuments')
  router.get('/users/:userId/documents/download-zip', '#controllers/document_review_controller.downloadUserDocumentsZip')
}).prefix('/api/ai').use(middleware.auth())
