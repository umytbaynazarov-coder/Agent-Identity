// Use TEST_URL environment variable, or default to localhost for local testing
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function test() {
  console.log('\n🧪 AgentAuths API Test Suite v0.2.0');
  console.log('🎯 Testing Scoped Permissions System\n');
  console.log('='.repeat(50));

  let agentId, apiKey, accessToken, adminAgentId, adminApiKey, adminToken;

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

  // Test 2: List Available Permissions
  console.log('\n📋 Test 2: List Available Permissions');
  try {
    const res = await fetch(`${BASE_URL}/permissions/list`);
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Available services:', Object.keys(data.permissions || {}).join(', '));
    console.log('   Format:', data.format);
    console.log('   ✅ PASSED');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 3: Register Agent with Scoped Permissions
  console.log('\n📋 Test 3: Register Agent with Scoped Permissions');
  try {
    const res = await fetch(`${BASE_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'test-agent',
        description: 'A test agent for development',
        owner_email: 'test@example.com',
        permissions: [
          'zendesk:tickets:read',
          'slack:messages:write',
          'hubspot:contacts:read'
        ]
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

  // Test 4: Register Admin Agent
  console.log('\n📋 Test 4: Register Admin Agent');
  try {
    const res = await fetch(`${BASE_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'admin-agent',
        description: 'Admin agent with full permissions',
        owner_email: 'admin@example.com',
        permissions: ['*:*:*']
      })
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    
    if (data.success) {
      adminAgentId = data.agent.agent_id;
      adminApiKey = data.credentials.api_key;
      console.log('   ✅ PASSED');
      console.log(`   📝 Saved: admin_agent_id=${adminAgentId}`);
    } else {
      console.log('   ❌ FAILED: No success response');
    }
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 5: Register with missing fields (should fail)
  console.log('\n📋 Test 5: Register with Missing Fields');
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

  // Test 6: Register with Invalid Permission Format
  console.log('\n📋 Test 6: Register with Invalid Permission Format');
  try {
    const res = await fetch(`${BASE_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'bad-perms-agent',
        owner_email: 'test@example.com',
        permissions: ['invalid-format', 'missing:colon']
      })
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Invalid permissions found:', data.invalid_permissions?.length || 0);
    console.log(res.status === 400 ? '   ✅ PASSED (correctly rejected)' : '   ❌ FAILED');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 7: Register with Unknown Service
  console.log('\n📋 Test 7: Register with Unknown Service');
  try {
    const res = await fetch(`${BASE_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'unknown-service-agent',
        owner_email: 'test@example.com',
        permissions: ['unknown:service:read']
      })
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log(res.status === 400 ? '   ✅ PASSED (correctly rejected)' : '   ❌ FAILED');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 8: Verify Agent
  console.log('\n📋 Test 8: Verify Regular Agent');
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

  // Test 9: Verify Admin Agent
  console.log('\n📋 Test 9: Verify Admin Agent');
  if (adminAgentId && adminApiKey) {
    try {
      const res = await fetch(`${BASE_URL}/agents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: adminAgentId, api_key: adminApiKey })
      });
      const data = await res.json();
      
      if (data.verified) {
        adminToken = data.token.access_token;
        console.log('   ✅ PASSED');
        console.log(`   📝 Got admin token`);
      } else {
        console.log('   ❌ FAILED: Not verified');
      }
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no admin credentials)');
  }

  // Test 10: Verify with wrong API key
  console.log('\n📋 Test 10: Verify with Wrong API Key');
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

  // Test 11: Get Agent (with token)
  console.log('\n📋 Test 11: Get Agent Details');
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

  // Test 12: Get Agent without token (should fail)
  console.log('\n📋 Test 12: Get Agent without Token');
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

  // Test 13: Get non-existent agent
  console.log('\n📋 Test 13: Get Non-existent Agent');
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

  // Test 14: Access Slack Integration (should succeed - has permission)
  console.log('\n📋 Test 14: Access Slack Integration (Authorized)');
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/integrations/slack/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Permission used:', data.permission_used);
      console.log(res.status === 200 ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 15: Access Zendesk Integration (should succeed - has permission)
  console.log('\n📋 Test 15: Access Zendesk Integration (Authorized)');
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/integrations/zendesk/tickets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'test' })
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Message:', data.message || data.error);
      // This agent only has zendesk:tickets:read, not write
      console.log(res.status === 403 ? '   ✅ PASSED (correctly blocked - needs write permission)' : '   ❌ Unexpected result');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 16: Access GitHub Integration (should fail - no permission)
  console.log('\n📋 Test 16: Access GitHub Integration (Unauthorized)');
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/integrations/github/repos`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Message:', data.error);
      console.log(res.status === 403 ? '   ✅ PASSED (correctly blocked)' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 17: Admin Access to List All Agents
  console.log('\n📋 Test 17: Admin Access to List All Agents');
  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/agents`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Agents found:', data.count || 0);
      console.log(res.status === 200 ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no admin token)');
  }

  // Test 18: Regular Agent Tries to List All Agents (should fail)
  console.log('\n📋 Test 18: Regular Agent Tries to List All Agents');
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/agents`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Message:', data.error);
      console.log(res.status === 403 ? '   ✅ PASSED (correctly blocked)' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 19: Refresh Token Flow
  console.log('\n📋 Test 19: Refresh Token Flow');
  let refreshToken;
  if (agentId && apiKey) {
    try {
      // First, verify to get tokens
      const verifyRes = await fetch(`${BASE_URL}/agents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, api_key: apiKey })
      });
      const verifyData = await verifyRes.json();

      if (verifyData.verified && verifyData.token.refresh_token) {
        refreshToken = verifyData.token.refresh_token;

        // Now use refresh token to get new access token
        const refreshRes = await fetch(`${BASE_URL}/agents/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        const refreshData = await refreshRes.json();

        console.log('   Status:', refreshRes.status);
        console.log('   Got new access token:', !!refreshData.access_token);
        console.log('   Got new refresh token:', !!refreshData.refresh_token);
        console.log(refreshRes.status === 200 && refreshData.access_token ? '   ✅ PASSED' : '   ❌ FAILED');
      } else {
        console.log('   ❌ FAILED: Could not get refresh token');
      }
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no agent credentials)');
  }

  // Test 20: Refresh Token with Invalid Token
  console.log('\n📋 Test 20: Refresh Token with Invalid Token');
  try {
    const res = await fetch(`${BASE_URL}/agents/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: 'rt_invalid_token_12345' })
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
    console.log(res.status === 401 ? '   ✅ PASSED (correctly rejected)' : '   ❌ FAILED');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  // Test 21: Register Webhook
  console.log('\n📋 Test 21: Register Webhook');
  let webhookId, webhookSecret;
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com/webhook',
          events: ['agent.verified', 'agent.revoked']
        })
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Response:', JSON.stringify(data, null, 2));

      if (data.success && data.webhook) {
        webhookId = data.webhook.id;
        webhookSecret = data.secret;
        console.log('   ✅ PASSED');
        console.log(`   📝 Webhook ID: ${webhookId}`);
      } else {
        console.log('   ❌ FAILED');
      }
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 22: List Webhooks
  console.log('\n📋 Test 22: List Webhooks');
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/webhooks`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log('   Webhooks found:', data.count || 0);
      console.log(res.status === 200 ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 23: Register Webhook with Invalid Events
  console.log('\n📋 Test 23: Register Webhook with Invalid Events');
  if (accessToken) {
    try {
      const res = await fetch(`${BASE_URL}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com/webhook',
          events: ['invalid.event']
        })
      });
      const data = await res.json();
      console.log('   Status:', res.status);
      console.log(res.status === 400 ? '   ✅ PASSED (correctly rejected)' : '   ❌ FAILED');
    } catch (err) {
      console.log('   ❌ FAILED:', err.message);
    }
  } else {
    console.log('   ⏭️  SKIPPED (no token)');
  }

  // Test 24: Delete Webhook
  console.log('\n📋 Test 24: Delete Webhook');
  if (accessToken && webhookId) {
    try {
      const res = await fetch(`${BASE_URL}/webhooks/${webhookId}`, {
        method: 'DELETE',
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
    console.log('   ⏭️  SKIPPED (no webhook to delete)');
  }

  // Test 25: Get Webhook Events List
  console.log('\n📋 Test 25: Get Valid Webhook Events');
  try {
    const res = await fetch(`${BASE_URL}/webhooks/events`);
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Events:', data.events);
    console.log(res.status === 200 && data.events ? '   ✅ PASSED' : '   ❌ FAILED');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test suite complete!');
  console.log('   Total tests: 25');
  console.log('   Testing scoped permissions: ✓');
  console.log('   Testing wildcards: ✓');
  console.log('   Testing permission validation: ✓');
  console.log('   Testing refresh tokens: ✓');
  console.log('   Testing webhooks: ✓\n');
}

test().catch(console.error);
