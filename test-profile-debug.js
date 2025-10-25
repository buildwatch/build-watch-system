// Using built-in fetch in Node.js 18+

async function testProfilePictureAPI() {
  try {
    console.log('🔍 Testing profile picture API for Rosaly M. Gutierrez...');
    
    const response = await fetch('http://localhost:3000/api/profile/picture/gutierrezmrosaly@gmail.com');
    const data = await response.json();
    
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response Data:', JSON.stringify(data, null, 2));
    
    if (data.profilePictureUrl) {
      console.log('✅ Profile picture URL found:', data.profilePictureUrl);
    } else {
      console.log('❌ No profile picture URL in response');
    }
    
    // Test with different identifiers
    console.log('\n🔍 Testing with different identifiers...');
    
    const identifiers = [
      'gutierrezmrosaly@gmail.com',
      'LGU-PMT-0003',
      '10e034f3-354c-4ca9-9ab4-6b913dda250a'
    ];
    
    for (const id of identifiers) {
      try {
        console.log(`\n--- Testing with: ${id} ---`);
        const testResponse = await fetch(`http://localhost:3000/api/profile/picture/${id}`);
        const testData = await testResponse.json();
        console.log('Status:', testResponse.status);
        console.log('Data:', JSON.stringify(testData, null, 2));
      } catch (error) {
        console.log('Error for', id, ':', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testProfilePictureAPI(); 