/**
 * Verification test for Void API Route (/api/void)
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

async function runApiTests() {
  console.log('🧪 Testing Void Editor Fast Apply API (/api/void)...\n');
  const baseUrl = 'http://localhost:3000/api/void';

  // 1. POST action="diff"
  const oldCode = 'const x = 1;\nconsole.log(x);';
  const newCode = 'const x = 42;\nconsole.log(x);';

  const diffRes = await postJson(baseUrl, {
    action: 'diff',
    filePath: 'sample.ts',
    oldContent: oldCode,
    newContent: newCode
  });

  if (diffRes.status === 200 && diffRes.body.hunks?.length > 0 && diffRes.body.unifiedDiff?.includes('+const x = 42;')) {
    console.log('✅ POST /api/void action="diff" returned computed hunks and unified diff');
  } else {
    console.error('❌ POST diff failed:', diffRes);
    process.exit(1);
  }

  // 2. POST action="fast_apply"
  const applyRes = await postJson(baseUrl, {
    action: 'fast_apply',
    originalContent: oldCode,
    hunks: diffRes.body.hunks
  });

  if (applyRes.status === 200 && applyRes.body.success && applyRes.body.updatedContent === newCode) {
    console.log('✅ POST /api/void action="fast_apply" applied hunks cleanly');
  } else {
    console.error('❌ POST fast_apply failed:', applyRes);
    process.exit(1);
  }

  // 3. POST action="ghost_text"
  const ghostRes = await postJson(baseUrl, {
    action: 'ghost_text',
    prefix: 'function calculateTotal(',
    fullCompletion: 'function calculateTotal(items: CartItem[]): number'
  });

  if (ghostRes.status === 200 && ghostRes.body.ghostText === 'items: CartItem[]): number') {
    console.log('✅ POST /api/void action="ghost_text" extracted inline ghost text');
  } else {
    console.error('❌ POST ghost_text failed:', ghostRes);
    process.exit(1);
  }

  console.log('\n🎉 Void Editor API tests passed successfully!');
}

runApiTests().catch(err => {
  console.error('Fatal API error:', err);
  process.exit(1);
});
