#!/bin/bash

# Fixed automated deployment script for Livo Backend using Git
# Fixes PostgreSQL password issue

set -e

DROPLET_IP="64.23.186.195"
DROPLET_USER="root"
DROPLET_PASSWORD='09Bvbechteliebe'
PROJECT_DIR="/var/www/livo-backend"
DB_PASSWORD="09Bvbechteliebe*"
GIT_REPO="https://github.com/Ajauregui69/livo-backend.git"

echo "🚀 Starting automated deployment with Git (FIXED)..."

# Function to run commands on remote server
run_remote() {
    sshpass -p "$DROPLET_PASSWORD" ssh -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP "$1"
}

# 1. Install sshpass if not available
if ! command -v sshpass &> /dev/null; then
    echo "📦 Installing sshpass..."
    sudo apt update
    sudo apt install -y sshpass
fi

# 2. Setup server environment
echo "🔧 Setting up server environment..."
run_remote "
    # Update system
    apt update && apt upgrade -y

    # Install Git if not installed
    apt install -y git

    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs

    # Install PM2 globally
    npm install -g pm2

    # Install PostgreSQL if not installed
    if ! command -v psql &> /dev/null; then
        apt install -y postgresql postgresql-contrib
        systemctl start postgresql
        systemctl enable postgresql
    fi

    # Remove existing directory if exists
    rm -rf $PROJECT_DIR

    # Clone repository
    git clone $GIT_REPO $PROJECT_DIR
    chown -R $DROPLET_USER:$DROPLET_USER $PROJECT_DIR
"

# 3. Setup PostgreSQL database (FIXED)
echo "🗄️ Setting up PostgreSQL database..."
run_remote "
    # Stop any running postgresql processes
    systemctl stop postgresql 2>/dev/null || true
    systemctl start postgresql

    # Set postgres user password using environment variable
    export PGPASSWORD='$DB_PASSWORD'

    # Set password without interactive prompt
    sudo -u postgres psql -c \"ALTER USER postgres PASSWORD '$DB_PASSWORD';\" 2>/dev/null || true

    # Create database
    sudo -u postgres createdb livodb 2>/dev/null || echo 'Database livodb already exists'

    # Configure PostgreSQL for local connections
    PG_VERSION=\$(ls /etc/postgresql/ | head -1)
    sed -i \"s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/g\" /etc/postgresql/\$PG_VERSION/main/postgresql.conf

    # Configure authentication
    cat > /etc/postgresql/\$PG_VERSION/main/pg_hba.conf << EOF
local   all             postgres                                md5
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
EOF

    systemctl restart postgresql

    # Test connection
    sleep 3
    PGPASSWORD='$DB_PASSWORD' psql -U postgres -h localhost -d livodb -c 'SELECT version();' || echo 'DB connection will be tested later'
"

# 4. Install dependencies and build
echo "📦 Installing dependencies and building..."
run_remote "
    cd $PROJECT_DIR
    npm ci --production
    npm run build
    mkdir -p logs
"

# 5. Setup environment and run migrations
echo "🔧 Setting up environment and running migrations..."
run_remote "
    cd $PROJECT_DIR
    cp .env.production .env

    # Test database connection first
    echo 'Testing database connection...'
    PGPASSWORD='$DB_PASSWORD' psql -U postgres -h localhost -d livodb -c 'SELECT version();'

    # Run migrations
    NODE_ENV=production node ace migration:run
"

# 6. Configure and start PM2
echo "🚀 Starting application with PM2..."
run_remote "
    cd $PROJECT_DIR
    pm2 delete livo-backend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
"

# 7. Configure Nginx
echo "🌐 Configuring Nginx..."
run_remote "
    # Install nginx if not installed
    if ! command -v nginx &> /dev/null; then
        apt install -y nginx
        systemctl start nginx
        systemctl enable nginx
    fi

    # Copy nginx configuration
    cp $PROJECT_DIR/nginx-simple.conf /etc/nginx/sites-available/livo-backend
    ln -sf /etc/nginx/sites-available/livo-backend /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test and reload nginx
    nginx -t
    systemctl reload nginx
"

# 8. Configure firewall
echo "🔒 Configuring firewall..."
run_remote "
    ufw --force enable
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw status
"

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is now available at: http://$DROPLET_IP"
echo "📝 Check application status: ssh root@$DROPLET_IP 'pm2 status'"
echo "📋 Check logs: ssh root@$DROPLET_IP 'pm2 logs livo-backend'"
echo ""
echo "🚀 Next steps:"
echo "1. Wait 5-30 minutes for DNS propagation"
echo "2. Run: ./setup-https.sh"