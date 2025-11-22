#!/usr/bin/env node
/**
 * Create a default profile picture
 * 
 * This script creates a simple default profile picture SVG that can be used
 * as a fallback when user profile pictures are missing.
 * 
 * Run: node scripts/create-default-profile-picture.js
 */

const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');
const defaultProfilePath = path.join(uploadsDir, 'default-profile.png');
const defaultProfileSvgPath = path.join(uploadsDir, 'default-profile.svg');

// Create a simple SVG default profile picture
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="100" cy="100" r="100" fill="#e0e0e0"/>
  
  <!-- User icon -->
  <g transform="translate(100, 100)">
    <!-- Head circle -->
    <circle cx="0" cy="-20" r="30" fill="#9e9e9e"/>
    
    <!-- Body -->
    <path d="M -40 20 Q -40 0 0 0 Q 40 0 40 20 L 40 60 Q 40 80 20 80 L -20 80 Q -40 80 -40 60 Z" fill="#9e9e9e"/>
  </g>
  
  <!-- Text -->
  <text x="100" y="180" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle">No Image</text>
</svg>`;

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`✅ Created uploads directory: ${uploadsDir}`);
}

// Write SVG file
try {
  fs.writeFileSync(defaultProfileSvgPath, svgContent);
  console.log(`✅ Created default profile picture (SVG): ${defaultProfileSvgPath}`);
} catch (error) {
  console.error(`❌ Error creating SVG: ${error.message}`);
  process.exit(1);
}

// Try to convert SVG to PNG if ImageMagick is available
const { execSync } = require('child_process');
try {
  execSync(`which convert`, { stdio: 'ignore' });
  // ImageMagick is available, convert SVG to PNG
  try {
    execSync(`convert -background none -size 200x200 ${defaultProfileSvgPath} ${defaultProfilePath}`, { stdio: 'ignore' });
    console.log(`✅ Created default profile picture (PNG): ${defaultProfilePath}`);
    console.log(`   (Converted from SVG using ImageMagick)`);
  } catch (error) {
    console.log(`⚠️  Could not convert SVG to PNG (ImageMagick convert failed)`);
    console.log(`   SVG file is available at: ${defaultProfileSvgPath}`);
    console.log(`   You can manually convert it or use the SVG directly`);
  }
} catch (error) {
  // ImageMagick not available, just use SVG
  console.log(`⚠️  ImageMagick not found - using SVG format`);
  console.log(`   SVG file created at: ${defaultProfileSvgPath}`);
  console.log(`   To create PNG, install ImageMagick: apt-get install imagemagick`);
  console.log(`   Or manually convert the SVG to PNG`);
}

console.log('\n✅ Default profile picture created!');
console.log('   The backend will now serve this image when profile pictures are missing.\n');

