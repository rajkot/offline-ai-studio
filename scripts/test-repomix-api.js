const assert = require('assert');

async function testRepomixApi() {
  console.log('[TEST] Checking Repomix API Route...');

  const baseUrl = 'http://localhost:3000';

  // Test 1: POST /api/repomix/pack (XML format)
  console.log('[TEST] Requesting XML codebase packing...');
  const resXml = await fetch(`${baseUrl}/api/repomix/pack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'xml',
      tokenBudget: 32000,
      removeComments: false
    })
  });

  assert.strictEqual(resXml.status, 200, 'Pack endpoint should return 200 OK');
  const xmlData = await resXml.json();
  assert.strictEqual(xmlData.success, true, 'Result success should be true');
  assert.strictEqual(xmlData.format, 'xml');
  assert.ok(xmlData.totalFiles > 0, 'Total files should be > 0');
  assert.ok(xmlData.totalTokens > 0, 'Total tokens should be > 0');
  assert.ok(xmlData.content.includes('<repository>'), 'XML output should contain <repository>');
  console.log(`[TEST] Successfully packed ${xmlData.totalFiles} files (${xmlData.totalTokens} tokens) into XML.`);

  // Test 2: POST /api/repomix/pack (JSON format)
  console.log('[TEST] Requesting JSON codebase packing...');
  const resJson = await fetch(`${baseUrl}/api/repomix/pack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'json',
      tokenBudget: 16000
    })
  });

  assert.strictEqual(resJson.status, 200, 'JSON pack should return 200 OK');
  const jsonData = await resJson.json();
  assert.strictEqual(jsonData.format, 'json');
  assert.ok(jsonData.content.length > 50, 'JSON content should be populated');

  console.log('[TEST] All Repomix API tests passed successfully! ✓');
}

testRepomixApi().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
