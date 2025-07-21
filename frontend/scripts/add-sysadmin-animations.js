// Script to add animations to all sysadmin modules
// This will be used to add fade-in-up animations to all sysadmin module files

const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '../src/pages/dashboard/sysadmin/modules');
const modules = [
  'announcements.astro',
  'office-groups.astro', 
  'security.astro',
  'configuration.astro',
  'backup-maintenance.astro',
  'user-logs.astro'
];

// Animation CSS to add
const animationCSS = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    opacity: 0;
  }
`;

modules.forEach(moduleFile => {
  const filePath = path.join(modulesDir, moduleFile);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add animation CSS if not already present
    if (!content.includes('@keyframes fadeInUp')) {
      // Find the last </style> tag and add animation CSS before it
      const styleEndIndex = content.lastIndexOf('</style>');
      if (styleEndIndex !== -1) {
        content = content.slice(0, styleEndIndex) + animationCSS + '\n' + content.slice(styleEndIndex);
      }
    }
    
    // Add animation classes to main sections
    content = content.replace(
      /<section class="p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">/g,
      '<section class="p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">'
    );
    
    // Add animation to header
    content = content.replace(
      /<h1 class="text-2xl font-bold mb-6 text-gray-800">/g,
      '<h1 class="text-2xl font-bold mb-6 text-gray-800 animate-fade-in-up" style="animation-delay: 0.1s;">'
    );
    
    // Add animation to main content cards
    content = content.replace(
      /<div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">/g,
      '<div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 animate-fade-in-up" style="animation-delay: 0.2s;">'
    );
    
    // Add animation to grid sections
    content = content.replace(
      /<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">/g,
      '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">'
    );
    
    // Add animation to individual cards in grids
    content = content.replace(
      /<div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">/g,
      '<div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-fade-in-up" style="animation-delay: 0.3s;">'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added animations to ${moduleFile}`);
  } else {
    console.log(`❌ File not found: ${moduleFile}`);
  }
});

console.log('🎉 Animation addition complete!'); 