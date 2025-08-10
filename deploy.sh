#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting Reddzit-Refresh Deployment..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin master

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build the project
echo "🔨 Building project..."
yarn build

# Set proper permissions
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data dist/

# Reload nginx
echo "🌐 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete! 🎉"
echo "🌍 Visit: https://reddzit.seojeek.com"
