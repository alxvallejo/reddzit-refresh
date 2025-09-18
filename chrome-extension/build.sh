#!/bin/bash

# Build script for Reddzit Chrome Extension

echo "🚀 Building Reddzit Chrome Extension..."

# Check if required files exist
echo "📋 Checking required files..."

required_files=("manifest.json" "background.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

# Check for icon files
icon_files=("icons/icon16.png" "icons/icon32.png" "icons/icon48.png" "icons/icon128.png")
missing_icons=()

for icon in "${icon_files[@]}"; do
    if [ ! -f "$icon" ]; then
        missing_icons+=("$icon")
    fi
done

# Report missing files
if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

if [ ${#missing_icons[@]} -ne 0 ]; then
    echo "⚠️  Missing icon files (extension will still work but needs icons for store):"
    for icon in "${missing_icons[@]}"; do
        echo "   - $icon"
    done
fi

# Check if background.js has been updated with real URL
if grep -q "your-app-domain.com" background.js; then
    echo "⚠️  Warning: Update the URL in background.js with your deployed app URL"
fi

# Create zip file for Chrome Web Store submission
echo "📦 Creating extension package..."
zip -r "reddzit-extension.zip" . -x "*.sh" "*.md" "build.sh" "reddzit-extension.zip"

echo "✅ Extension package created: reddzit-extension.zip"
echo ""
echo "📝 Next steps:"
echo "1. Update background.js with your deployed app URL"
echo "2. Add icon files to the icons/ directory" 
echo "3. Test the extension locally in Chrome"
echo "4. Upload reddzit-extension.zip to Chrome Web Store Developer Dashboard"
echo ""
echo "🌐 Chrome Web Store Developer Dashboard:"
echo "https://chrome.google.com/webstore/devconsole/" 