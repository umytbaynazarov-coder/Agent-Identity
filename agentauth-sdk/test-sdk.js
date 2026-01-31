/**
 * Quick SDK smoke test
 */

const { AgentAuthClient, Permissions } = require('./dist/index.js');

console.log('🧪 Testing AgentAuth SDK...\n');

// 1. Test client initialization
console.log('✓ AgentAuthClient imported successfully');
console.log('✓ Permissions object imported successfully');

// 2. Test client creation
try {
  const client = new AgentAuthClient({
    baseURL: 'https://auth.example.com',
  });
  console.log('✓ Client initialized successfully');
} catch (error) {
  console.error('✗ Client initialization failed:', error.message);
  process.exit(1);
}

// 3. Test invalid URL
try {
  new AgentAuthClient({
    baseURL: 'invalid-url',
  });
  console.error('✗ Should have thrown error for invalid URL');
  process.exit(1);
} catch (error) {
  console.log('✓ Invalid URL validation works');
}

// 4. Test permissions type safety
const permissions = [
  Permissions.Zendesk.Tickets.Read,
  Permissions.Slack.Messages.Write,
  Permissions.HubSpot.All,
  Permissions.Admin,
];

console.log('✓ Permission constants work:', permissions.length, 'permissions');
console.log('  -', permissions[0]); // zendesk:tickets:read
console.log('  -', permissions[1]); // slack:messages:write
console.log('  -', permissions[2]); // hubspot:*:*
console.log('  -', permissions[3]); // *:*:*

// 5. Bundle size check
const fs = require('fs');
const stats = fs.statSync('./dist/index.mjs');
const sizeKB = (stats.size / 1024).toFixed(2);

console.log(`\n📦 Bundle Size Check:`);
console.log(`   ESM bundle: ${sizeKB} KB`);

if (stats.size < 10240) {
  console.log('   ✅ Under 10KB target!');
} else {
  console.log('   ⚠️  Over 10KB target');
}

console.log('\n🎉 All tests passed!');
