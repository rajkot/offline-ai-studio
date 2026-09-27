const assert = require('assert');

async function testMacroApi() {
  console.log('[TEST] Checking Smart Macro API Endpoints...');

  const baseUrl = 'http://localhost:3000';

  // 1. Test GET /api/automation/macro/templates
  console.log('[TEST] Fetching macro starter templates...');
  const resTemplates = await fetch(`${baseUrl}/api/automation/macro/templates`);
  assert.strictEqual(resTemplates.status, 200, 'Templates endpoint should return 200 OK');
  const templates = await resTemplates.json();
  assert.ok(Array.isArray(templates), 'Templates should be an array');
  assert.ok(templates.length >= 2, 'Should have at least 2 starter templates');
  assert.ok(templates[0].id, 'Template should have an id');
  assert.ok(templates[0].steps && templates[0].steps.length > 0, 'Template should have steps');
  console.log(`[TEST] Found ${templates.length} starter templates:`, templates.map(t => t.name));

  // 2. Test POST /api/automation/macro (action: validate)
  console.log('[TEST] Testing POST /api/automation/macro (validate)...');
  const resValidate = await fetch(`${baseUrl}/api/automation/macro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'validate',
      macro: {
        id: 'api-test-macro',
        name: 'API Test',
        targetUrl: 'http://localhost:3000',
        mode: 'browser',
        steps: [
          { id: 'step-1', action: 'navigate' },
          { id: 'step-2', action: 'smartFill', targetIntent: 'Full Name', value: '{{csv.name}}' }
        ]
      }
    })
  });
  assert.strictEqual(resValidate.status, 200, 'Validate action should return 200 OK');
  const valResult = await resValidate.json();
  assert.strictEqual(valResult.valid, true, 'Valid macro should pass');

  // 3. Test POST /api/automation/macro (action: match)
  console.log('[TEST] Testing POST /api/automation/macro (match with NanoJev)...');
  const resMatch = await fetch(`${baseUrl}/api/automation/macro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'match',
      intent: 'Customer Phone',
      candidates: [
        { id: 'txt_name', tagName: 'input', name: 'fullname', placeholder: 'Enter Name' },
        { id: 'txt_phone', tagName: 'input', name: 'phone', placeholder: 'Customer Phone' },
        { id: 'btn_sub', tagName: 'button', text: 'Submit' }
      ]
    })
  });
  assert.strictEqual(resMatch.status, 200, 'Match action should return 200 OK');
  const matchResult = await resMatch.json();
  assert.strictEqual(matchResult.bestCandidate.id, 'txt_phone', 'Should pick txt_phone');
  assert.ok(matchResult.confidence > 0.6, 'Confidence should be high');

  console.log('[TEST] All Smart Macro API tests passed successfully! ✓');
}

testMacroApi().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
