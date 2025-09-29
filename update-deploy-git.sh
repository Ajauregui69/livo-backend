#!/bin/bash

# Quick update deployment script using Git
# Much faster for updates - just pulls latest changes

set -e

DROPLET_IP="64.23.186.195"
DROPLET_USER="root"
DROPLET_PASSWORD='09Bvbechteliebe'
PROJECT_DIR="/var/www/livo-backend"

echo "🔄 Starting Git-based update deployment..."

# Function to run commands on remote server
run_remote() {
    sshpass -p "$DROPLET_PASSWORD" ssh -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP "$1"
}

# 1. Pull latest changes and update
echo "📥 Pulling latest changes..."
run_remote "
    cd $PROJECT_DIR
    git pull origin main
    npm ci --production
    npm run build
    cp .env.production .env
    NODE_ENV=production node ace migration:run
    pm2 restart livo-backend
"

echo "✅ Update deployment completed!"
echo "🌐 Application updated at: https://api.havi.app"
echo "📝 Check status: ssh root@$DROPLET_IP 'pm2 status'"