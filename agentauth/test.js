const BASE_URL = 'https://agentauth-production-b6b2.up.railway.app';

async function test() {
  console.log('\n🧪 AgentAuths API Test Suite\n');
  console.log('='.repeat(50));

  let agentId, apiKey, accessToken;

  // Test 1: Health Check
  console.log('\n📋 Test 1: Health Check');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
    console.log('   ✅ PASSED');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 2: Register Agent
  console.log('\n📋 Test 2: Register Agent');
  try {
    const res = await fetch(`${BASE_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'test-agent',
        description: 'A test agent for development',
        owner_email: 'test@example.com',
        permissions: ['read', 'write']
      })
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      agentId = data.agent.agent_id;
      apiKey = data.credentials.api_key;
      console.log('   ✅ PASSED');
      console.log(`   📝 Saved: agent_id=${agentId}`);
    } else {
      console.log('   ❌ FAILED: No success response');
    }
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 3: Register with missing fields (should fail)
  console.log('\n📋 Test 3: Register with Missing Fields');
  try {
    const res = await fetch(`${BASE_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'incomplete-agent' })
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
    console.log(res.status === 400 ? '   ✅ PASSED (correctly rejected)' : '   ❌ FAILED');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 4: Verify Agent
  console.log('\n📋 Test 4: Verify Agent');
  if (agentId && apiKey) {
    try {
      const res = await fetch(`${BASE_URL}/agents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, api_key: apiKey })
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Response:', JSON.stringify(data, null, 2));
      
      if (data.verified) {
        accessToken = data.token.access_token;
        console.log('   ✅ PASSED');
        console.log(`   📝 Got access token (expires in ${data.token.expires_in}s)`);
      } else {
        console.log('   ❌ FAILED: Not verified');
      }
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no agent credentials)');
  }

  // Test 5: Verify with wrong API key
  console.log('\n📋 Test 5: Verify with Wrong API Key');
  if (agentId) {
    try {
      const res = await fetch(`${BASE_URL}/agents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, api_key: 'ak_wrong_key_12345' })
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Response:', JSON.stringify(data, null, 2));
      console.log(res.status === 401 ? '   ✅ PASSED (correctly rejected)' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no agent ID)');
  }

  // Test 6: Get Agent (with token)
  console.log('\n📋 Test 6: Get Agent Details');
  if (agentId && accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/agents/${agentId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Response:', JSON.stringify(data, null, 2));
      console.log(res.status === 200 ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 7: Get Agent without token (should fail)
  console.log('\n📋 Test 7: Get Agent without Token');
  if (agentId) {
    try {
      const res = await fetch(`${BASE_URL}/agents/${agentId}`);
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Response:', JSON.stringify(data, null, 2));
      console.log(res.status === 401 ? '   ✅ PASSED (correctly rejected)' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no agent ID)');
  }

  // Test 8: Get non-existent agent
  console.log('\n📋 Test 8: Get Non-existent Agent');
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/agents/agt_doesnotexist123`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Response:', JSON.stringify(data, null, 2));
      console.log(res.status === 403 || res.status === 404 ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test suite complete!\n');
}

test().catch(console.error);
