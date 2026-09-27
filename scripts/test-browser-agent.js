const assert = require('assert');

async function testBrowserAgent() {
  console.log('[TEST] Checking Browser Agent Engine Subsystem...');

  const { browserAgentEngine, BrowserAgentEngine } = require('../lib/ai/browserAgentEngine');
  assert.ok(browserAgentEngine, 'browserAgentEngine singleton should exist');
  assert.ok(BrowserAgentEngine, 'BrowserAgentEngine class should be exported');

  // 1. Status check
  const status = browserAgentEngine.getStatus();
  console.log('[TEST] Browser Status:', status);
  assert.strictEqual(typeof status.available, 'boolean');
  assert.strictEqual(typeof status.binaryPath, 'string');
  assert.ok(status.available, 'At least one browser (Edge or Chrome) should be detected on Windows');

  // 2. Headless DOM Audit on localhost:3000
  console.log('[TEST] Performing live audit of http://localhost:3000...');
  const audit = await browserAgentEngine.auditPage('http://localhost:3000', { timeoutMs: 15000 });
  console.log('[TEST] Audit result summary:', {
    success: audit.success,
    title: audit.title,
    errorsCount: audit.errorsCount,
    warningsCount: audit.warningsCount,
    latencyMs: audit.latencyMs,
    hasScreenshot: Boolean(audit.screenshotBase64)
  });

  assert.strictEqual(audit.success, true, 'Audit should succeed on running dev server');
  assert.ok(audit.title.length > 0, 'Page title should be captured');
  assert.ok(Array.isArray(audit.consoleLogs), 'Console logs should be an array');

  console.log('[TEST] All Browser Agent Engine tests passed successfully! ✓');
}

testBrowserAgent().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
