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
  console.log('🧪 Testing Training API Routes...\n');

  // 1. Test GET /api/training/dataset
  console.log('1. Testing GET /api/training/dataset...');
  const datasetRes = await get('/api/training/dataset');
  console.log('   Status:', datasetRes.status, '| Pairs harvested:', datasetRes.data?.count);
  if (datasetRes.status !== 200 || !datasetRes.data?.pairs) {
    throw new Error('GET /api/training/dataset failed');
  }

  // 2. Test POST /api/training/start
  console.log('\n2. Testing POST /api/training/start...');
  const startRes = await post('/api/training/start', {
    baseModel: 'qwen2.5-coder:1.5b',
    loraRank: 16,
    loraAlpha: 32,
    quantization: '4bit_qlora_nf4',
    epochs: 2,
    dataset: datasetRes.data.pairs
  });
  console.log('   Status:', startRes.status, '| Job ID:', startRes.data?.jobId);
  console.log('   Final Loss:', startRes.data?.metrics?.finalLoss);
  console.log('   Modelfile synthesized length:', startRes.data?.modelfile?.length);
  if (startRes.status !== 200 || !startRes.data?.modelfile) {
    throw new Error('POST /api/training/start failed');
  }

  // 3. Test POST /api/training/evaluate
  console.log('\n3. Testing POST /api/training/evaluate...');
  const evalRes = await post('/api/training/evaluate', {
    prompt: 'Implement a thread-safe token bucket rate limiter class',
    baseModel: 'qwen2.5-coder:1.5b',
    jobId: startRes.data.jobId
  });
  console.log('   Status:', evalRes.status);
  console.log('   Base Output preview:', evalRes.data?.baseOutput?.slice(0, 50));
  console.log('   Adapter Output preview:', evalRes.data?.adapterOutput?.slice(0, 50));
  if (evalRes.status !== 200 || !evalRes.data?.adapterOutput) {
    throw new Error('POST /api/training/evaluate failed');
  }

  console.log('\n✅ ALL TRAINING API ROUTES PASSED CLEANLY!\n');
}

run().catch(err => {
  console.error('❌ Route testing failed:', err);
  process.exit(1);
});
