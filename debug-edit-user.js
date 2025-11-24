// ============================================
// EDIT USER MODAL DEBUGGING SCRIPT
// ============================================
// Copy and paste this entire script into your browser console
// while the Edit User modal is open

(function() {
  console.log('🔍 ========== EDIT USER MODAL DEBUG SCRIPT ==========');
  
  // 1. Check if modal elements exist
  console.log('\n1️⃣ Checking Modal Elements:');
  const editUserModal = document.getElementById('editUserModal');
  const editUserForm = document.getElementById('editUserForm');
  const editUserBtn = document.getElementById('editUserBtn');
  const editUserError = document.getElementById('editUserError');
  
  console.log('  editUserModal:', editUserModal ? '✅ Found' : '❌ Missing');
  console.log('  editUserForm:', editUserForm ? '✅ Found' : '❌ Missing');
  console.log('  editUserBtn:', editUserBtn ? '✅ Found' : '❌ Missing');
  console.log('  editUserError:', editUserError ? '✅ Found' : '❌ Missing');
  
  // 2. Check modal visibility
  console.log('\n2️⃣ Checking Modal Visibility:');
  if (editUserModal) {
    console.log('  Modal classes:', editUserModal.className);
    console.log('  Modal display:', window.getComputedStyle(editUserModal).display);
    console.log('  Modal visibility:', window.getComputedStyle(editUserModal).visibility);
    console.log('  Modal opacity:', window.getComputedStyle(editUserModal).opacity);
    console.log('  Modal z-index:', window.getComputedStyle(editUserModal).zIndex);
    console.log('  Has "hidden" class:', editUserModal.classList.contains('hidden'));
    console.log('  Has "show" class:', editUserModal.classList.contains('show'));
  }
  
  // 3. Check form fields
  console.log('\n3️⃣ Checking Form Fields:');
  if (editUserForm) {
    const fields = {
      firstName: editUserForm.querySelector('input[name="firstName"]'),
      middleName: editUserForm.querySelector('input[name="middleName"]'),
      lastName: editUserForm.querySelector('input[name="lastName"]'),
      fullName: editUserForm.querySelector('input[name="fullName"]'),
      username: editUserForm.querySelector('input[name="username"]'),
      contactNumber: editUserForm.querySelector('input[name="contactNumber"]'),
      userId: editUserForm.querySelector('input[name="userId"]')
    };
    
    for (const [name, field] of Object.entries(fields)) {
      if (field) {
        console.log(`  ${name}: ✅ Found - Value: "${field.value}"`);
      } else {
        console.log(`  ${name}: ❌ Missing`);
      }
    }
  }
  
  // 4. Check current user data
  console.log('\n4️⃣ Checking Current User Data:');
  const currentEditUser = window.currentEditUser;
  if (currentEditUser) {
    console.log('  ✅ currentEditUser exists:', currentEditUser);
    console.log('  User ID:', currentEditUser.id);
    console.log('  User Name:', currentEditUser.fullName || currentEditUser.name);
    console.log('  User Email:', currentEditUser.email || currentEditUser.username);
  } else {
    console.log('  ❌ currentEditUser is missing!');
    console.log('  This is likely the problem - user data not stored when modal opens');
  }
  
  // 5. Check original form values
  console.log('\n5️⃣ Checking Original Form Values:');
  // Try to access originalFormValues from the closure
  // Since it's in a closure, we'll check if the form has been modified
  if (editUserForm) {
    const firstName = editUserForm.querySelector('input[name="firstName"]')?.value || '';
    const lastName = editUserForm.querySelector('input[name="lastName"]')?.value || '';
    const username = editUserForm.querySelector('input[name="username"]')?.value || '';
    const contactNumber = editUserForm.querySelector('input[name="contactNumber"]')?.value || '';
    
    console.log('  Current form values:');
    console.log('    firstName:', firstName);
    console.log('    lastName:', lastName);
    console.log('    username:', username);
    console.log('    contactNumber:', contactNumber);
  }
  
  // 6. Check Update button state
  console.log('\n6️⃣ Checking Update Button State:');
  if (editUserBtn) {
    console.log('  Button disabled:', editUserBtn.disabled);
    console.log('  Button classes:', editUserBtn.className);
    console.log('  Button text:', editUserBtn.textContent.trim());
  }
  
  // 7. Check for event listeners
  console.log('\n7️⃣ Checking Event Listeners:');
  if (editUserForm) {
    // Check if form has submit handler
    const formClone = editUserForm.cloneNode(true);
    console.log('  Form has submit handler: Check manually by submitting');
  }
  
  // 8. Test API endpoint availability
  console.log('\n8️⃣ Testing API Endpoint:');
  const token = localStorage.getItem('token');
  if (token) {
    console.log('  ✅ Token found:', token.substring(0, 20) + '...');
    
    // Test if we can reach the API
    if (currentEditUser && currentEditUser.id) {
      fetch(`http://localhost:3000/api/users/${currentEditUser.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        console.log('  ✅ API endpoint reachable');
        console.log('  User data from API:', data);
      })
      .catch(err => {
        console.error('  ❌ API endpoint error:', err);
      });
    } else {
      console.log('  ⚠️ Cannot test API - user ID missing');
    }
  } else {
    console.log('  ❌ No authentication token found!');
  }
  
  // 9. Manual test function
  console.log('\n9️⃣ Manual Test Function:');
  window.testEditUserSubmit = function() {
    console.log('🧪 Testing Edit User Form Submission...');
    
    if (!editUserForm) {
      console.error('❌ Edit user form not found');
      return;
    }
    
    if (!currentEditUser || !currentEditUser.id) {
      console.error('❌ User ID not available. currentEditUser:', currentEditUser);
      return;
    }
    
    const formData = new FormData(editUserForm);
    const firstName = editUserForm.querySelector('input[name="firstName"]')?.value || '';
    const lastName = editUserForm.querySelector('input[name="lastName"]')?.value || '';
    const contactNumber = editUserForm.querySelector('input[name="contactNumber"]')?.value || '';
    
    console.log('📝 Form values to submit:');
    console.log('  firstName:', firstName);
    console.log('  lastName:', lastName);
    console.log('  contactNumber:', contactNumber);
    console.log('  userId:', currentEditUser.id);
    
    // Add required fields
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('contactNumber', contactNumber);
    formData.append('fullName', `${firstName} ${lastName}`.trim());
    formData.append('name', `${firstName} ${lastName}`.trim());
    
    // Add preserved fields
    if (currentEditUser.group) formData.append('group', currentEditUser.group);
    if (currentEditUser.role) formData.append('role', currentEditUser.role);
    if (currentEditUser.subRole) formData.append('subRole', currentEditUser.subRole);
    if (currentEditUser.department || currentEditUser.departmentOffice) {
      formData.append('departmentOffice', currentEditUser.departmentOffice || currentEditUser.department || '');
    }
    if (currentEditUser.status) formData.append('status', currentEditUser.status);
    
    // Log FormData
    console.log('📦 FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No authentication token');
      return;
    }
    
    const apiUrl = `http://localhost:3000/api/users/${currentEditUser.id}`;
    console.log('🌐 Making API call to:', apiUrl);
    
    fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    .then(async res => {
      console.log('📡 Response status:', res.status);
      console.log('📡 Response ok:', res.ok);
      
      const data = await res.json();
      console.log('📡 Response data:', data);
      
      if (res.ok && data.success) {
        console.log('✅ Update successful!');
        return data;
      } else {
        console.error('❌ Update failed:', data.error || 'Unknown error');
        throw new Error(data.error || 'Update failed');
      }
    })
    .catch(err => {
      console.error('❌ Request error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack
      });
    });
  };
  
  console.log('  ✅ Test function created: window.testEditUserSubmit()');
  console.log('  💡 Run: testEditUserSubmit() to manually test the update');
  
  // 10. Check for JavaScript errors
  console.log('\n🔟 Checking for JavaScript Errors:');
  const errorCount = window.onerror ? 'Check manually' : 'No global error handler';
  console.log('  Global error handler:', errorCount);
  
  // 11. Summary
  console.log('\n📊 SUMMARY:');
  const issues = [];
  if (!editUserModal) issues.push('Edit User Modal not found');
  if (!editUserForm) issues.push('Edit User Form not found');
  if (!currentEditUser) issues.push('Current User Data not stored (window.currentEditUser)');
  if (!currentEditUser?.id) issues.push('User ID missing');
  if (!localStorage.getItem('token')) issues.push('Authentication token missing');
  
  if (issues.length === 0) {
    console.log('  ✅ No obvious issues found');
    console.log('  💡 Try running: testEditUserSubmit() to test the update manually');
  } else {
    console.log('  ❌ Issues found:');
    issues.forEach(issue => console.log('    -', issue));
  }
  
  console.log('\n🔍 ========== DEBUG SCRIPT COMPLETE ==========');
  console.log('💡 To test manually, run: testEditUserSubmit()');
})();

