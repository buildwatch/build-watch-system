const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '../src/pages/dashboard/lgu-pmt-mpmec/modules');

function fixModuleAuth() {
  const files = fs.readdirSync(modulesDir);
  
  files.forEach(file => {
    if (file.endsWith('.astro')) {
      const filePath = path.join(modulesDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace authToken with token
      const originalContent = content;
      content = content.replace(/localStorage\.getItem\('authToken'\)/g, "localStorage.getItem('token')");
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Fixed ${file}`);
      } else {
        console.log(`- No changes needed for ${file}`);
      }
    }
  });
  
  console.log('\nAll module files processed!');
}

fixModuleAuth(); 