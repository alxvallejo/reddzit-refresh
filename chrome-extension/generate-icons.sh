#!/bin/bash

# Generate Chrome Extension Icons from smeagol.png

echo "🎨 Generating Chrome Extension Icons from smeagol.png..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "📦 Install with: brew install imagemagick"
    echo "🔄 Or try with sips (macOS built-in): will attempt to use sips instead"
    
    # Try using macOS built-in sips instead
    if command -v sips &> /dev/null; then
        echo "✅ Using sips (macOS built-in tool)"
        
        # Create icons directory if it doesn't exist
        mkdir -p icons
        
        # Generate all required icon sizes using sips
        echo "📐 Generating 16x16 icon..."
        sips -z 16 16 ../src/smeagol.png --out icons/icon16.png
        
        echo "📐 Generating 32x32 icon..."
        sips -z 32 32 ../src/smeagol.png --out icons/icon32.png
        
        echo "📐 Generating 48x48 icon..."
        sips -z 48 48 ../src/smeagol.png --out icons/icon48.png
        
        echo "📐 Generating 128x128 icon..."
        sips -z 128 128 ../src/smeagol.png --out icons/icon128.png
        
        echo "✅ Icons generated successfully using sips!"
    else
        echo "❌ Neither ImageMagick nor sips available. Please install ImageMagick:"
        echo "   brew install imagemagick"
        exit 1
    fi
else
    echo "✅ Using ImageMagick"
    
    # Create icons directory if it doesn't exist
    mkdir -p icons
    
    # Generate all required icon sizes using ImageMagick
    echo "📐 Generating 16x16 icon..."
    convert ../src/smeagol.png -resize 16x16 icons/icon16.png
    
    echo "📐 Generating 32x32 icon..."
    convert ../src/smeagol.png -resize 32x32 icons/icon32.png
    
    echo "📐 Generating 48x48 icon..."
    convert ../src/smeagol.png -resize 48x48 icons/icon48.png
    
    echo "📐 Generating 128x128 icon..."
    convert ../src/smeagol.png -resize 128x128 icons/icon128.png
    
    echo "✅ Icons generated successfully using ImageMagick!"
fi

# Verify all icons were created
echo ""
echo "📋 Verifying generated icons:"
for size in 16 32 48 128; do
    if [ -f "icons/icon${size}.png" ]; then
        echo "✅ icon${size}.png - $(ls -lh icons/icon${size}.png | awk '{print $5}')"
    else
        echo "❌ icon${size}.png - MISSING"
    fi
done

echo ""
echo "🎉 Icon generation complete!"
echo "📁 Icons saved to: chrome-extension/icons/"
echo "🔍 You can now test the extension locally or run ./build.sh to package it" 