const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// Create a simple default profile picture (SVG)
const defaultProfileSVG = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4B5563;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1F2937;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#grad)" rx="20"/>
  <circle cx="100" cy="80" r="30" fill="#9CA3AF"/>
  <path d="M 40 160 Q 100 120 160 160" stroke="#9CA3AF" stroke-width="8" fill="none"/>
  <text x="100" y="190" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">SA</text>
</svg>`;

const defaultProfilePath = path.join(uploadsDir, 'default-profile.svg');

// Only create if it doesn't exist
if (!fs.existsSync(defaultProfilePath)) {
  fs.writeFileSync(defaultProfilePath, defaultProfileSVG);
  console.log('✅ Created default profile picture:', defaultProfilePath);
} else {
  console.log('ℹ️  Default profile picture already exists');
}

console.log('✅ Profile picture setup complete!');
console.log('📁 Uploads directory:', uploadsDir);
console.log('🖼️  Default profile:', defaultProfilePath);
