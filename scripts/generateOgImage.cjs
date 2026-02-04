const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Reddzit brand colors
const colors = {
  primary: '#b6aaf1',
  bg: '#4a3f7a',
  accent: '#9f72d6',
  text: '#f0eef5',
  darkPurple: '#262129'
};

// Create 1200x630 canvas (standard OG size)
const canvas = createCanvas(1200, 630);
const ctx = canvas.getContext('2d');

// Create gradient background
const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
gradient.addColorStop(0, colors.bg);
gradient.addColorStop(0.5, colors.accent);
gradient.addColorStop(1, colors.darkPurple);
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1200, 630);

// Add subtle overlay pattern (optional)
ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
for (let i = 0; i < 20; i++) {
  ctx.fillRect(i * 60, 0, 30, 630);
}

// Add text
ctx.fillStyle = colors.text;
ctx.font = 'bold 120px "Helvetica Neue", Arial, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Reddzit', 600, 280);

// Add tagline
ctx.font = '36px "Helvetica Neue", Arial, sans-serif';
ctx.fillStyle = colors.primary;
ctx.fillText('AI-curated Reddit digest', 600, 380);

// Save to public directory
const outputPath = path.join(__dirname, '../public/og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log('✅ OG image generated:', outputPath);
