const assert = require('assert');

async function testRepomixEngine() {
  console.log('[TEST] Checking Repomix Codebase Context Packer Engine...');

  const { repomixEngine, RepomixEngine } = require('../lib/ai/repomixEngine');
  assert.ok(repomixEngine, 'repomixEngine singleton should exist');
  assert.ok(RepomixEngine, 'RepomixEngine class should be exported');

  // Test 1: Secret Redaction
  console.log('[TEST] Testing Secret Shield regex redaction...');
  const dirtyCode = `
    const openaiKey = "sk-proj-1234567890abcdef1234567890abcdef12";
    const anthropicKey = "sk-ant-api03-abcdef1234567890abcdef1234567890";
    const ghToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
    const cleanVar = "Hello World";
  `;
  const { sanitized, redactedCount } = repomixEngine.redactSecrets(dirtyCode);
  console.log('[TEST] Redacted count:', redactedCount);
  assert.strictEqual(redactedCount, 3, 'Should redact all 3 API keys');
  assert.ok(!sanitized.includes('sk-proj-'), 'OpenAI key must be scrubbed');
  assert.ok(!sanitized.includes('sk-ant-'), 'Anthropic key must be scrubbed');
  assert.ok(!sanitized.includes('ghp_'), 'GitHub token must be scrubbed');
  assert.ok(sanitized.includes('[REDACTED_SECRET'), 'Should contain redacted secret placeholder');
  assert.ok(sanitized.includes('Hello World'), 'Non-secret code must be preserved');

  // Test 2: Token Estimation
  console.log('[TEST] Testing Token Estimation...');
  const text = 'function calculateSum(a: number, b: number): number { return a + b; }';
  const tokens = repomixEngine.estimateTokens(text);
  console.log(`[TEST] Estimated tokens for "${text}": ${tokens}`);
  assert.ok(tokens > 10 && tokens < 30, 'Token count should be reasonable');

  // Test 3: XML Formatting
  console.log('[TEST] Testing XML Packing Serialization...');
  const mockFiles = {
    'src/index.ts': 'export const app = "Offline AI Studio";',
    'src/utils/math.ts': 'export function add(a: number, b: number) { return a + b; }'
  };

  const xmlResult = await repomixEngine.packWorkspace(mockFiles, { format: 'xml' });
  assert.strictEqual(xmlResult.totalFiles, 2, 'Should pack 2 files');
  assert.ok(xmlResult.content.includes('<file path="src/index.ts">'), 'XML must contain file path tag');
  assert.ok(xmlResult.content.includes('Offline AI Studio'), 'XML must contain file content');
  assert.ok(xmlResult.totalTokens > 0, 'Total tokens should be computed');

  // Test 4: Markdown Formatting
  console.log('[TEST] Testing Markdown Packing Serialization...');
  const mdResult = await repomixEngine.packWorkspace(mockFiles, { format: 'markdown' });
  assert.ok(mdResult.content.includes('### `src/index.ts`'), 'Markdown must have header');
  assert.ok(mdResult.content.includes('```typescript'), 'Markdown must have codeblock');

  // Test 5: JSON Formatting
  console.log('[TEST] Testing JSON Packing Serialization...');
  const jsonResult = await repomixEngine.packWorkspace(mockFiles, { format: 'json' });
  const parsed = JSON.parse(jsonResult.content);
  assert.ok(Array.isArray(parsed.files), 'JSON content should have files array');
  assert.strictEqual(parsed.files.length, 2);

  // Test 6: Token Budgeting Truncation
  console.log('[TEST] Testing Token Budget limit...');
  const budgetResult = await repomixEngine.packWorkspace(mockFiles, {
    format: 'xml',
    tokenBudget: 15 // Very small budget to force truncation
  });
  assert.ok(budgetResult.isTruncated, 'Should be marked as truncated');
  assert.ok(budgetResult.content.includes('[WARNING: Token budget reached'), 'Should include truncation notice');

  console.log('[TEST] All Repomix Engine unit tests passed successfully! ✓');
}

testRepomixEngine().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
