const assert = require('assert');

async function testUiTarsApi() {
  console.log('[TEST] Checking UI-TARS API Route...');

  const baseUrl = 'http://localhost:3000';

  // 1. Test POST /api/automation/ui-tars (action: parse)
  console.log('[TEST] Testing action parse endpoint...');
  const resParse = await fetch(`${baseUrl}/api/automation/ui-tars`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'parse',
      modelOutput: 'Thought: Save customer record. Action: click(point=[550, 420])'
    })
  });

  assert.strictEqual(resParse.status, 200, 'Parse action should return 200 OK');
  const parseData = await resParse.json();
  assert.strictEqual(parseData.parsed.action, 'click');
  assert.deepStrictEqual(parseData.parsed.point, [550, 420]);
  assert.ok(parseData.parsed.thought.includes('Save customer record'));

  // 2. Test POST /api/automation/ui-tars (action: scale)
  console.log('[TEST] Testing coordinate scaling endpoint...');
  const resScale = await fetch(`${baseUrl}/api/automation/ui-tars`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'scale',
      point: [500, 500],
      screenWidth: 1920,
      screenHeight: 1080
    })
  });

  assert.strictEqual(resScale.status, 200, 'Scale action should return 200 OK');
  const scaleData = await resScale.json();
  assert.deepStrictEqual(scaleData.scaled, [960, 540]);

  // 3. Test POST /api/automation/ui-tars (action: validate)
  console.log('[TEST] Testing safety validation endpoint...');
  const resVal = await fetch(`${baseUrl}/api/automation/ui-tars`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'validate',
      parsedAction: { action: 'hotkey', key: 'alt+f4' }
    })
  });

  assert.strictEqual(resVal.status, 200, 'Validate action should return 200 OK');
  const valData = await resVal.json();
  assert.strictEqual(valData.safe, false, 'Unsafe command should be blocked');

  console.log('[TEST] All UI-TARS API tests passed successfully! ✓');
}

testUiTarsApi().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
