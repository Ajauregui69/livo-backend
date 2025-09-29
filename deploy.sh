#!/bin/bash

# Deployment script for Livo Backend
echo "🚀 Starting deployment..."

# Exit on any error
set -e

# Copy production environment
cp .env.production .env

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build application
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Stop existing PM2 process if running
echo "🛑 Stopping existing processes..."
pm2 delete livo-backend 2>/dev/null || true

# Run migrations
echo "📊 Running database migrations..."
NODE_ENV=production node ace migration:run

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js

# Save PM2 configuration and setup auto-restart
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo "🌐 Application running on port 3333"
echo "📝 Check logs with: pm2 logs livo-backend"