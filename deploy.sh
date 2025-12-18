#!/bin/bash

# Deployment script for Sip'n'Sleigh
# This script builds and deploys the application to Vercel

set -e

echo "🚀 Starting deployment process..."

# Step 1: Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix errors before deploying."
  exit 1
fi

echo "✅ Build successful!"

# Step 2: Deploy to Vercel
echo "🌐 Deploying to Vercel..."
npx vercel --prod

echo "✅ Deployment complete!"

