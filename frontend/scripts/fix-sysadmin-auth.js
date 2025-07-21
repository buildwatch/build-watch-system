import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of sysadmin module pages
const sysadminPages = [
  'audit-trail.astro',
  'backup-maintenance.astro',
  'configuration.astro',
  'office-groups.astro',
  'security.astro',
  'system-health.astro',
  'announcements.astro'
];

const sysadminDir = path.join(__dirname, '../src/pages/dashboard/sysadmin');

// Authentication script to inject
const authScript = `
  <script>
    // Authentication check
    document.addEventListener('DOMContentLoaded', function() {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        window.location.href = '/login/lgu-pmt';
        return;
      }
      
      try {
        const user = JSON.parse(userData);
        
        if (user.role !== 'SYS.AD') {
          // Redirect to appropriate dashboard based on role
          if (user.role === 'EXEC') {
            window.location.href = '/dashboard/executive/ExecutiveDashboard';
          } else {
            window.location.href = '/login/lgu-pmt';
          }
          return;
        }
        
        console.log('Page loaded for user:', user.username);
        
        // Update welcome message
        const welcomeSpan = document.querySelector('.text-sm.text-gray-600');
        if (welcomeSpan) {
          welcomeSpan.textContent = \`Welcome, \${user.name || user.username}\`;
        }
        
      } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '/login/lgu-pmt';
      }
    });
  </script>`;

// Function to add authentication to a file
function addAuthToFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if authentication script already exists
    if (content.includes('Authentication check')) {
      console.log(`✅ ${path.basename(filePath)} already has authentication`);
      return;
    }
    
    // Find the first <script> tag and add authentication before it
    const scriptIndex = content.indexOf('<script>');
    if (scriptIndex !== -1) {
      content = content.slice(0, scriptIndex) + authScript + '\n' + content.slice(scriptIndex);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Added authentication to ${path.basename(filePath)}`);
    } else {
      console.log(`⚠️  No <script> tag found in ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
  }
}

// Process all sysadmin pages
console.log('🔧 Adding authentication to sysadmin module pages...\n');

sysadminPages.forEach(page => {
  const filePath = path.join(sysadminDir, page);
  if (fs.existsSync(filePath)) {
    addAuthToFile(filePath);
  } else {
    console.log(`❌ File not found: ${page}`);
  }
});

console.log('\n✅ Authentication fix completed!'); 