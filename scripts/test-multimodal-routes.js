const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('Testing Multimodal API Routes on http://127.0.0.1:3000...\n');

  // Test 1: GET /api/multimodal/status
  console.log('1. Testing GET /api/multimodal/status...');
  const res1 = await request('GET', '/api/multimodal/status');
  console.log('Status Response:', res1.statusCode, res1.data);
  if (res1.statusCode !== 200 || !res1.data.success) {
    throw new Error('GET /api/multimodal/status failed');
  }

  // Test 2: POST /api/multimodal/voice-command
  console.log('\n2. Testing POST /api/multimodal/voice-command...');
  const res2 = await request('POST', '/api/multimodal/voice-command', {
    transcript: 'create an analytics overview card with metric stats',
    activeFile: 'components/AnalyticsCard.tsx',
    existingCode: '',
  });
  console.log('Voice Command Response:', res2.statusCode, {
    success: res2.data.success,
    intent: res2.data.intent,
    summary: res2.data.summary,
    codeLength: res2.data.synthesizedCode?.length,
  });
  if (res2.statusCode !== 200 || !res2.data.success || !res2.data.synthesizedCode) {
    throw new Error('POST /api/multimodal/voice-command failed');
  }

  // Test 3: POST /api/multimodal/vision-to-code
  console.log('\n3. Testing POST /api/multimodal/vision-to-code...');
  const res3 = await request('POST', '/api/multimodal/vision-to-code', {
    componentName: 'ServerMetricsBoard',
    visualSpec: 'System resource gauges and real-time alerts stream',
    framework: 'react',
  });
  console.log('Vision to Code Response:', res3.statusCode, {
    success: res3.data.success,
    componentName: res3.data.componentName,
    codeLength: res3.data.synthesizedCode?.length,
    elementsDetected: res3.data.elementsDetected,
  });
  if (res3.statusCode !== 200 || !res3.data.success || !res3.data.synthesizedCode) {
    throw new Error('POST /api/multimodal/vision-to-code failed');
  }

  console.log('\n✅ All Multimodal API route tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ Multimodal API Route Test Error:', err);
  process.exit(1);
});
