#!/bin/bash

# HTTPS Setup Script with Let's Encrypt
# Run this AFTER the initial deployment and DNS configuration

set -e

DROPLET_IP="64.23.186.195"
DROPLET_USER="root"
DROPLET_PASSWORD='09Bvbechteliebe'
PROJECT_DIR="/var/www/livo-backend"

# YOU MUST SET YOUR DOMAIN HERE
DOMAIN="api.havi.app"

if [ "$DOMAIN" = "YOUR_DOMAIN" ]; then
    echo "❌ ERROR: You must set your domain in the DOMAIN variable!"
    echo "Edit this script and replace YOUR_DOMAIN with your actual domain"
    exit 1
fi

echo "🔒 Setting up HTTPS for domain: $DOMAIN"

# Function to run commands on remote server
run_remote() {
    sshpass -p "$DROPLET_PASSWORD" ssh -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP "$1"
}

# 1. Install Certbot
echo "📦 Installing Certbot..."
run_remote "
    apt update
    apt install -y certbot python3-certbot-nginx
"

# 2. Copy HTTPS nginx configuration
echo "🌐 Preparing Nginx configuration..."
sed "s/YOUR_DOMAIN/$DOMAIN/g" nginx-https.conf > nginx-https-ready.conf
sshpass -p "$DROPLET_PASSWORD" scp -o StrictHostKeyChecking=no nginx-https-ready.conf $DROPLET_USER@$DROPLET_IP:$PROJECT_DIR/

# 3. Get SSL certificate
echo "🔐 Obtaining SSL certificate..."
run_remote "
    # Temporarily use simple config for verification
    cp $PROJECT_DIR/nginx-simple.conf /etc/nginx/sites-available/livo-backend
    sed -i 's/64.23.186.195/$DOMAIN/g' /etc/nginx/sites-available/livo-backend
    nginx -t && systemctl reload nginx

    # Get certificate
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

    # Use HTTPS configuration
    cp $PROJECT_DIR/nginx-https-ready.conf /etc/nginx/sites-available/livo-backend
    nginx -t && systemctl reload nginx
"

# 4. Update environment file
echo "🔧 Updating application configuration..."
run_remote "
    cd $PROJECT_DIR
    sed -i 's|APP_URL=.*|APP_URL=https://$DOMAIN|g' .env.production
    cp .env.production .env
    pm2 restart livo-backend
"

# 5. Setup auto-renewal
echo "🔄 Setting up SSL auto-renewal..."
run_remote "
    # Test renewal
    certbot renew --dry-run

    # Add to crontab for auto-renewal
    echo '0 12 * * * /usr/bin/certbot renew --quiet' | crontab -
"

echo "✅ HTTPS setup completed!"
echo "🌐 Your application is now available at: https://$DOMAIN"
echo "🔒 SSL certificate will auto-renew every 60 days"
echo ""
echo "Next steps:"
echo "1. Update your DNS A record to point $DOMAIN to $DROPLET_IP"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "3. Run this script again if needed"

# Clean up
rm -f nginx-https-ready.conf