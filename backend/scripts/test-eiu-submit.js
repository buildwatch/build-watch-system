// Using built-in fetch (Node.js 18+)

async function testEIUSubmit() {
  try {
    // First, get a token by logging in
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'mdrrmopartner1@gmail.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('Login successful, token obtained');

    // Get EIU projects to find a project ID
    const projectsResponse = await fetch('http://localhost:3000/api/eiu/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!projectsResponse.ok) {
      console.error('Failed to get projects:', await projectsResponse.text());
      return;
    }

    const projectsData = await projectsResponse.json();
    console.log('Projects found:', projectsData.projects.length);

    if (projectsData.projects.length === 0) {
      console.log('No projects found for EIU user');
      return;
    }

    const projectId = projectsData.projects[0].id;
    console.log('Using project ID:', projectId);

    // Test the submit-update endpoint
    const submitData = {
      projectId: projectId,
      updateType: 'milestone',
      milestoneUpdates: JSON.stringify([
        {
          milestoneId: 'test-milestone-1',
          status: 'in_progress',
          budgetAllocation: 1000,
          budgetBreakdown: 'Test budget breakdown',
          physicalDescription: 'Test physical description',
          notes: 'Test notes'
        }
      ])
    };

    console.log('Submitting data:', JSON.stringify(submitData, null, 2));

    const submitResponse = await fetch('http://localhost:3000/api/eiu/submit-update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submitData)
    });

    console.log('Response status:', submitResponse.status);
    console.log('Response headers:', submitResponse.headers.raw());

    const responseText = await submitResponse.text();
    console.log('Response body:', responseText);

    if (submitResponse.ok) {
      console.log('✅ Submit successful!');
    } else {
      console.log('❌ Submit failed');
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testEIUSubmit(); 