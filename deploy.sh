#!/bin/bash

# Chuhai Deployment Script
# This script prepares and deploys the Chuhai platform to Vercel

set -e

echo "🌊 Chuhai Platform Deployment"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "${RED}Error: package.json not found. Please run from project root.${NC}"
    exit 1
fi

echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🔍 Step 2: Running type check..."
npx tsc --noEmit || true

echo ""
echo "🏗️  Step 3: Building project..."
npm run build

echo ""
echo "🚀 Step 4: Deploying to Vercel..."
if command -v vercel &> /dev/null; then
    vercel --prod
else
    echo "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
    vercel --prod
fi

echo ""
echo "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Your Chuhai platform is now live!"
echo "Don't forget to:"
echo "  1. Set up environment variables in Vercel dashboard"
echo "  2. Configure Supabase database"
echo "  3. Set up Stripe webhook"
echo ""
