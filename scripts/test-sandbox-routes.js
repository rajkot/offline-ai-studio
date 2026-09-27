const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('🧪 Testing Sandbox API Routes...\n');

  // 1. Test GET /api/sandbox/status
  console.log('1. Testing GET /api/sandbox/status...');
  const statusRes = await get('/api/sandbox/status');
  console.log('   Status:', statusRes.status, '| Engine:', statusRes.data?.sandboxEngine);
  if (statusRes.status !== 200 || !statusRes.data?.quotaLimits) {
    throw new Error('GET /api/sandbox/status failed');
  }

  // 2. Test POST /api/sandbox/execute
  console.log('\n2. Testing POST /api/sandbox/execute...');
  const execRes = await post('/api/sandbox/execute', {
    code: 'const a = 15; const b = 27; console.log("Calculating inside sandbox"); a + b;',
    timeoutMs: 2000
  });
  console.log('   Status:', execRes.status, '| Success:', execRes.data?.success, '| Return:', execRes.data?.returnValue);
  if (execRes.status !== 200 || execRes.data?.returnValue !== 42) {
    throw new Error('POST /api/sandbox/execute failed');
  }

  // 3. Test POST /api/sandbox/inspect-command (Dangerous Command)
  console.log('\n3. Testing POST /api/sandbox/inspect-command...');
  const inspectRes = await post('/api/sandbox/inspect-command', {
    command: 'rm -rf /'
  });
  console.log('   Status:', inspectRes.status, '| Command Status:', inspectRes.data?.status, '| Score:', inspectRes.data?.riskScore);
  if (inspectRes.status !== 200 || inspectRes.data?.status !== 'BLOCKED') {
    throw new Error('POST /api/sandbox/inspect-command failed to block rm -rf /');
  }

  console.log('\n✅ ALL SANDBOX API ROUTES PASSED CLEANLY!\n');
}

run().catch(err => {
  console.error('❌ Sandbox route test failed:', err);
  process.exit(1);
});
