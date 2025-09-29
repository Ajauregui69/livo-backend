#!/bin/bash

# Quick update deployment script
# Use this for subsequent deployments after initial setup

set -e

DROPLET_IP="64.23.186.195"
DROPLET_USER="root"
DROPLET_PASSWORD='09Bvbechteliebe'
PROJECT_DIR="/var/www/livo-backend"

echo "🔄 Starting update deployment..."

# Function to run commands on remote server
run_remote() {
    sshpass -p "$DROPLET_PASSWORD" ssh -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    sshpass -p "$DROPLET_PASSWORD" scp -o StrictHostKeyChecking=no -r "$1" $DROPLET_USER@$DROPLET_IP:"$2"
}

# 1. Copy updated files
echo "📁 Copying updated files..."
copy_to_remote "." "$PROJECT_DIR"

# 2. Update and restart application
echo "🔄 Updating application..."
run_remote "
    cd $PROJECT_DIR
    npm ci --production
    npm run build
    cp .env.production .env
    NODE_ENV=production node ace migration:run
    pm2 restart livo-backend
"

echo "✅ Update deployment completed!"
echo "🌐 Application updated at: http://$DROPLET_IP"
echo "📝 Check status: ssh root@$DROPLET_IP 'pm2 status'"