#!/bin/bash

# Environment Setup Helper
# This script helps you create production environment files

set -e

echo "🔧 Blood Bank Buddy - Environment Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Frontend environment
setup_frontend_env() {
    echo ""
    print_info "Setting up Frontend Environment (.env.production)"
    echo ""
    
    read -p "Enter your Backend API URL (e.g., https://api.yourapp.com): " API_URL
    read -p "Enter Azure OpenAI Endpoint (optional, press Enter to skip): " OPENAI_ENDPOINT
    
    if [ -n "$OPENAI_ENDPOINT" ]; then
        read -p "Enter Azure OpenAI Key: " OPENAI_KEY
        read -p "Enter Azure OpenAI Deployment (e.g., gpt-4o-mini): " OPENAI_DEPLOYMENT
    fi
    
    cat > .env.production << EOF
# Backend API URL
VITE_API_URL=${API_URL}

# Azure OpenAI Configuration (Optional)
VITE_AZURE_OPENAI_ENDPOINT=${OPENAI_ENDPOINT}
VITE_AZURE_OPENAI_KEY=${OPENAI_KEY}
VITE_AZURE_OPENAI_DEPLOYMENT=${OPENAI_DEPLOYMENT:-gpt-4o-mini}
EOF
    
    print_success "Frontend environment file created: .env.production"
}

# Backend environment
setup_backend_env() {
    echo ""
    print_info "Setting up Backend Environment (server/.env.production)"
    echo ""
    
    echo "Database Configuration:"
    read -p "SQL Server (e.g., server.database.windows.net): " SQL_SERVER
    read -p "SQL Database Name: " SQL_DATABASE
    read -p "SQL Username: " SQL_USER
    read -sp "SQL Password: " SQL_PASSWORD
    echo ""
    
    echo ""
    echo "Firebase Configuration:"
    read -p "Firebase Project ID: " FIREBASE_PROJECT_ID
    read -p "Firebase Client Email: " FIREBASE_CLIENT_EMAIL
    read -p "Firebase Database URL: " FIREBASE_DATABASE_URL
    echo "Enter Firebase Private Key (paste and press Enter, then Ctrl+D):"
    FIREBASE_PRIVATE_KEY=$(cat)
    
    echo ""
    echo "Security:"
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-this-jwt-secret-$(date +%s)")
    print_info "Generated JWT Secret: $JWT_SECRET"
    
    echo ""
    read -p "Allowed Frontend Origins (comma-separated): " ALLOWED_ORIGINS
    
    echo ""
    echo "Email Configuration (optional, press Enter to skip):"
    read -p "Email Host (e.g., smtp.gmail.com): " EMAIL_HOST
    if [ -n "$EMAIL_HOST" ]; then
        read -p "Email Port (e.g., 587): " EMAIL_PORT
        read -p "Email User: " EMAIL_USER
        read -sp "Email Password: " EMAIL_PASSWORD
        echo ""
        read -p "Email From Address: " EMAIL_FROM
    fi
    
    cat > server/.env.production << EOF
# Application
NODE_ENV=production
PORT=5000

# Database Configuration
SQL_SERVER=${SQL_SERVER}
SQL_DATABASE=${SQL_DATABASE}
SQL_USER=${SQL_USER}
SQL_PASSWORD=${SQL_PASSWORD}
SQL_PORT=1433
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=false

# Firebase Configuration
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
FIREBASE_PRIVATE_KEY="${FIREBASE_PRIVATE_KEY}"
FIREBASE_DATABASE_URL=${FIREBASE_DATABASE_URL}

# Security
JWT_SECRET=${JWT_SECRET}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}

# Email Configuration
EMAIL_HOST=${EMAIL_HOST}
EMAIL_PORT=${EMAIL_PORT:-587}
EMAIL_SECURE=false
EMAIL_USER=${EMAIL_USER}
EMAIL_PASSWORD=${EMAIL_PASSWORD}
EMAIL_FROM=${EMAIL_FROM}

# Logging
LOG_LEVEL=info
EOF
    
    print_success "Backend environment file created: server/.env.production"
}

# Main menu
main_menu() {
    echo ""
    echo "What would you like to set up?"
    echo "1) Frontend environment only"
    echo "2) Backend environment only"
    echo "3) Both (recommended)"
    echo "4) Exit"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1) setup_frontend_env ;;
        2) setup_backend_env ;;
        3) setup_frontend_env && setup_backend_env ;;
        4) exit 0 ;;
        *) print_warning "Invalid choice"; main_menu ;;
    esac
    
    echo ""
    print_success "Environment setup complete!"
    echo ""
    print_info "Next steps:"
    print_info "1. Review your .env.production files"
    print_info "2. Run deployment script: ./deploy.sh"
    print_info "3. Or deploy manually following DEPLOYMENT_GUIDE.md"
}

# Run
main_menu
