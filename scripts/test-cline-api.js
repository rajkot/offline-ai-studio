/**
 * Test for Cline & Roo Code API Route
 */
const http = require('http');

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    }).on('error', reject);
  });
}

async function runApiTests() {
  console.log('🧪 Testing Cline / Roo Code API (/api/cline)...\n');
  const baseUrl = 'http://localhost:3000/api/cline';

  // 1. GET modes
  const modesRes = await getJson(`${baseUrl}?action=modes`);
  if (modesRes.status === 200 && modesRes.body.modes?.length >= 4) {
    console.log('✅ GET /api/cline?action=modes returned modes:', modesRes.body.modes.map(m => m.name).join(', '));
  } else {
    console.error('❌ GET modes failed:', modesRes);
    process.exit(1);
  }

  // 2. GET prompt for architect
  const promptRes = await getJson(`${baseUrl}?action=prompt&mode=architect`);
  if (promptRes.status === 200 && promptRes.body.prompt?.includes('ARCHITECT')) {
    console.log('✅ GET /api/cline?action=prompt returned architect prompt');
  } else {
    console.error('❌ GET prompt failed:', promptRes);
    process.exit(1);
  }

  // 3. POST parse
  const parseRes = await postJson(baseUrl, {
    action: 'parse',
    text: '<read_file path="package.json" />'
  });
  if (parseRes.status === 200 && parseRes.body.toolCalls?.length === 1 && parseRes.body.toolCalls[0].name === 'read_file') {
    console.log('✅ POST /api/cline action="parse" successfully parsed tool call');
  } else {
    console.error('❌ POST parse failed:', parseRes);
    process.exit(1);
  }

  // 4. POST execute_step (read_file on package.json)
  const execRes = await postJson(baseUrl, {
    action: 'execute_step',
    toolCall: {
      name: 'read_file',
      parameters: { path: 'package.json' }
    }
  });
  if (execRes.status === 200 && execRes.body.success && execRes.body.output?.includes('offline-ai-studio')) {
    console.log('✅ POST /api/cline action="execute_step" read_file verified package.json');
  } else {
    console.error('❌ POST execute_step read_file failed:', execRes);
    process.exit(1);
  }

  console.log('\n🎉 Cline API integration tests passed successfully!');
}

runApiTests().catch(err => {
  console.error('Fatal API test error:', err);
  process.exit(1);
});
