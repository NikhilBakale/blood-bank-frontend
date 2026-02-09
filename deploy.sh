#!/bin/bash

# Blood Bank Buddy - Quick Deployment Script
# This script helps you deploy the application quickly

set -e  # Exit on error

echo "🩸 Blood Bank Buddy - Deployment Script"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Check if required tools are installed
check_dependencies() {
    echo "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+ first."
        exit 1
    fi
    print_success "Node.js $(node --version) found"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    print_success "npm $(npm --version) found"
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Docker deployment will not be available."
    else
        print_success "Docker $(docker --version | cut -d' ' -f3) found"
    fi
}

# Select deployment method
select_deployment() {
    echo ""
    echo "Select deployment method:"
    echo "1) Vercel + Railway (Recommended - Easiest)"
    echo "2) Docker (Full control)"
    echo "3) Netlify + Render"
    echo "4) Manual (I'll deploy myself)"
    echo "5) Exit"
    echo ""
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1) deploy_vercel_railway ;;
        2) deploy_docker ;;
        3) deploy_netlify_render ;;
        4) manual_deploy ;;
        5) exit 0 ;;
        *) print_error "Invalid choice. Please try again."; select_deployment ;;
    esac
}

# Deploy to Vercel + Railway
deploy_vercel_railway() {
    echo ""
    print_info "Deploying with Vercel (Frontend) + Railway (Backend)"
    echo ""
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    # Deploy backend first
    echo ""
    print_info "Step 1: Deploying Backend to Railway"
    cd server
    print_warning "Make sure you have set up your environment variables in Railway dashboard!"
    read -p "Press Enter to continue with Railway deployment..."
    railway login
    railway init
    railway up
    
    print_success "Backend deployed to Railway!"
    echo ""
    read -p "Enter your Railway backend URL (e.g., https://your-app.railway.app): " BACKEND_URL
    
    # Deploy frontend
    cd ..
    echo ""
    print_info "Step 2: Deploying Frontend to Vercel"
    
    # Create/update .env.production
    cat > .env.production << EOF
VITE_API_URL=${BACKEND_URL}
EOF
    
    print_warning "Make sure to set VITE_AZURE_OPENAI_* variables in Vercel dashboard if using AI chatbot!"
    read -p "Press Enter to continue with Vercel deployment..."
    vercel login
    vercel --prod
    
    print_success "Frontend deployed to Vercel!"
    echo ""
    print_success "🎉 Deployment complete!"
    print_info "Don't forget to:"
    print_info "1. Update ALLOWED_ORIGINS in Railway with your Vercel URL"
    print_info "2. Set environment variables in both dashboards"
    print_info "3. Test your deployment"
}

# Deploy with Docker
deploy_docker() {
    echo ""
    print_info "Deploying with Docker"
    echo ""
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if docker-compose exists
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed. Please install docker-compose first."
        exit 1
    fi
    
    print_warning "Make sure you have configured .env files!"
    print_info "Required files:"
    print_info "  - .env.production"
    print_info "  - server/.env.production"
    echo ""
    read -p "Have you configured the .env files? (y/n): " configured
    
    if [ "$configured" != "y" ]; then
        print_warning "Please configure .env files first. Templates:"
        print_info "  - .env.production.example → .env.production"
        print_info "  - server/.env.production.example → server/.env.production"
        exit 1
    fi
    
    print_info "Building Docker images..."
    docker-compose build
    
    print_info "Starting services..."
    docker-compose up -d
    
    print_success "Services started!"
    echo ""
    docker-compose ps
    echo ""
    print_info "Access your application:"
    print_info "  Frontend: http://localhost"
    print_info "  Backend: http://localhost:5000"
    print_info "  Health Check: http://localhost:5000/api/health"
    echo ""
    print_info "View logs: docker-compose logs -f"
    print_info "Stop services: docker-compose down"
}

# Deploy to Netlify + Render
deploy_netlify_render() {
    echo ""
    print_info "Deploying with Netlify (Frontend) + Render (Backend)"
    echo ""
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    print_info "Step 1: Deploy Backend to Render"
    print_warning "Please deploy backend manually using Render dashboard:"
    print_info "1. Go to https://render.com"
    print_info "2. Create new Web Service"
    print_info "3. Connect your GitHub repository"
    print_info "4. Set root directory to: server"
    print_info "5. Set build command to: npm install"
    print_info "6. Set start command to: node server.js"
    print_info "7. Add environment variables from server/.env.production.example"
    echo ""
    read -p "Enter your Render backend URL: " BACKEND_URL
    
    # Deploy frontend
    echo ""
    print_info "Step 2: Deploying Frontend to Netlify"
    
    # Update .env.production
    cat > .env.production << EOF
VITE_API_URL=${BACKEND_URL}
EOF
    
    netlify login
    netlify deploy --prod
    
    print_success "Deployment initiated!"
}

# Manual deployment guide
manual_deploy() {
    echo ""
    print_info "Manual Deployment Guide"
    echo ""
    print_info "Please refer to DEPLOYMENT_GUIDE.md for detailed instructions."
    print_info "Quick links:"
    print_info "  - Vercel: https://vercel.com/docs"
    print_info "  - Railway: https://docs.railway.app"
    print_info "  - Netlify: https://docs.netlify.com"
    print_info "  - Render: https://render.com/docs"
    print_info "  - Azure: https://docs.microsoft.com/azure/app-service"
    echo ""
}

# Main execution
main() {
    check_dependencies
    select_deployment
}

# Run main function
main
