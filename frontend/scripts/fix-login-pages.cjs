const fs = require('fs');
const path = require('path');

// Define the login pages to fix
const loginPages = [
  { 
    path: 'src/pages/login/eiu.astro', 
    name: 'EIU',
    color: '#3C9CEB',
    userTypes: ['EIU', 'EPIU Manager', 'EPIU Staff']
  },
  { 
    path: 'src/pages/login/ems.astro', 
    name: 'EMS',
    color: '#2EC44A',
    userTypes: ['EMS', 'NGO Representative', 'CSO Member', 'PPMC Representative']
  },
  { 
    path: 'src/pages/login/iu.astro', 
    name: 'LGU-IU',
    color: '#F8C734',
    userTypes: ['LGU-IU', 'MDC Chair', 'Oversight Officer', 'Implementing Staff']
  }
];

// Template for error message element
const errorMessageElement = '<div id="errorMessage" class="hidden bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm font-medium"></div>';

// Template for form fields
function getFormFields(color, userTypes) {
  return `
            <div id="errorMessage" class="hidden bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm font-medium"></div>
            <div class="flex gap-4">
              <div class="flex-1">
                <label for="username" class="block text-sm font-bold text-[#fff] mb-1">Username</label>
                <input type="text" id="username" name="username" required class="w-full px-4 py-2.5 rounded-lg bg-white/80 text-[${color}] font-semibold border-none focus:ring-2 focus:ring-[${color}] placeholder:text-[${color}]/60" placeholder="Enter your username" />
              </div>
            </div>
            <div class="flex gap-4 items-start">
              <div class="flex-1">
                <label for="email" class="block text-sm font-bold text-[#fff] mb-1">Email Address</label>
                <input type="email" id="email" name="email" required class="w-full px-4 py-2.5 rounded-lg bg-white/80 text-[${color}] font-semibold border-none focus:ring-2 focus:ring-[${color}] placeholder:text-[${color}]/60" placeholder="Enter your email" />
              </div>
              <div class="flex-1">
                <label for="userType" class="block text-sm font-bold text-[#fff] mb-1">User Type</label>
                <select id="userType" name="userType" class="w-full px-4 py-2.5 rounded-lg bg-white/80 text-[${color}] font-semibold border-none focus:ring-2 focus:ring-[${color}]">
                  <option value="">Select</option>
                  ${userTypes.map(type => `<option value="${type}">${type}</option>`).join('\n                  ')}
                </select>
              </div>
            </div>
            <div>
              <label for="password" class="block text-sm font-bold text-[#fff] mb-1">Password</label>
              <input type="password" id="password" name="password" required class="w-full px-4 py-2.5 rounded-lg bg-white/80 text-[${color}] font-semibold border-none focus:ring-2 focus:ring-[${color}] placeholder:text-[${color}]/60" placeholder="Enter your password" />
            </div>`;
}

// Template for JavaScript
function getJavaScript() {
  return `
  <script>
    import authService from '../../services/auth.js';
    
    document.addEventListener('DOMContentLoaded', function() {
      const loginForm = document.getElementById('loginForm');
      const loginBtn = document.getElementById('loginBtn');
      const errorMessage = document.getElementById('errorMessage');
      
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const userType = document.getElementById('userType').value;
        const password = document.getElementById('password').value;
        
        // Basic validation
        if (!username || !email || !userType || !password) {
          errorMessage.textContent = 'Please fill in all fields.';
          errorMessage.classList.remove('hidden');
          return;
        }
        
        // Show loading state
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorMessage.classList.add('hidden');
        
        try {
          const result = await authService.login(username, password);
          
          if (result.success) {
            // Login successful - redirect will be handled by auth service
            console.log('Login successful:', result.user);
          } else {
            // Show error message
            errorMessage.textContent = result.error || 'Login failed. Please check your credentials.';
            errorMessage.classList.remove('hidden');
          }
        } catch (error) {
          console.error('Login error:', error);
          errorMessage.textContent = 'An error occurred during login. Please try again.';
          errorMessage.classList.remove('hidden');
        } finally {
          // Reset button state
          loginBtn.disabled = false;
          loginBtn.textContent = 'LOG IN';
        }
      });
    });
  </script>`;
}

// Process each login page
loginPages.forEach(({ path: filePath, name, color, userTypes }) => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    console.log(`Processing ${name} login page...`);
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace the form fields section
    const formFieldsRegex = /<form id="loginForm" class="w-full flex flex-col gap-4">([\s\S]*?)<\/form>/;
    const newFormContent = `<form id="loginForm" class="w-full flex flex-col gap-4">${getFormFields(color, userTypes)}
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <input type="checkbox" id="remember" name="remember" class="h-4 w-4 text-[${color}] focus:ring-[${color}] border-gray-300 rounded" />
                <label for="remember" class="text-xs text-white">Remember Me</label>
                <input type="checkbox" id="notRobot" name="notRobot" class="h-4 w-4 text-[${color}] focus:ring-[${color}] border-gray-300 rounded ml-4" />
                <label for="notRobot" class="text-xs text-white">I'm not a robot</label>
              </div>
              <a href="#" class="text-xs text-white/80 hover:text-white underline">Forgot Password?</a>
            </div>
            <button type="submit" id="loginBtn" class="w-full mt-4 py-3 rounded-xl bg-[${color}] text-white font-extrabold text-lg shadow-lg hover:bg-[${color.replace('#', '#')}] transition">LOG IN</button>
          </form>`;
    
    content = content.replace(formFieldsRegex, newFormContent);
    
    // Replace the JavaScript section
    const scriptRegex = /<script>[\s\S]*?<\/script>/;
    content = content.replace(scriptRegex, getJavaScript());
    
    // Write the updated content back
    fs.writeFileSync(fullPath, content, 'utf8');
    
    console.log(`✅ ${name} login page updated successfully!`);
  } else {
    console.log(`⚠ ${name} login page not found at ${fullPath}`);
  }
});

console.log('\n🎉 All login pages have been updated with proper form validation and error handling!'); 