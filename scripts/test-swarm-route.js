// Test Swarm Status Route GET and POST
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('1. Testing GET /api/swarm/status...');
  const getRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/swarm/status',
    method: 'GET'
  });
  console.log('GET status:', getRes.status);
  console.log('GET agents count:', getRes.data?.agents?.length);
  console.log('GET consensusScore:', getRes.data?.consensusScore);

  if (getRes.status !== 200 || !getRes.data?.agents) {
    console.error('FAIL: GET /api/swarm/status failed');
    process.exit(1);
  }

  console.log('2. Testing POST /api/swarm/status with action: trigger_step...');
  const postRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/swarm/status',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    action: 'trigger_step',
    prompt: 'Implement a thread-safe token bucket rate limiter class',
    activeFile: 'lib/rateLimiter.ts'
  });

  console.log('POST status:', postRes.status);
  console.log('POST verdict:', postRes.data?.overallVerdict);
  console.log('POST consensusScore:', postRes.data?.consensusScore);
  console.log('POST consensusCode length:', postRes.data?.consensusCode?.length);
  console.log('POST debateLog length:', postRes.data?.debateLog?.length);

  if (postRes.status !== 200 || !postRes.data?.consensusCode) {
    console.error('FAIL: POST /api/swarm/status failed');
    process.exit(1);
  }

  console.log('✅ Swarm Status Route Verified Successfully!');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
