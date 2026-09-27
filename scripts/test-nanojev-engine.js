const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function testNanoJevEngine() {
  console.log('[TEST] Checking NanoJev Engine Subsystem...');

  const { nanoJevEngine, NanoJevEngine } = require('../lib/ai/nanoJevEngine');
  assert.ok(nanoJevEngine, 'nanoJevEngine singleton instance should exist');
  assert.ok(NanoJevEngine, 'NanoJevEngine class should be exported');

  // 1. Status check
  const status = nanoJevEngine.getStatus();
  console.log('[TEST] Initial Status:', status);
  assert.strictEqual(typeof status.installed, 'boolean');
  assert.strictEqual(status.modelId, 'C-Tianyu/NanoJev');
  assert.strictEqual(status.params, '0.6B');
  assert.strictEqual(status.backbone, 'Qwen3-0.6B');

  // 2. Decision evaluation test
  const state = 'User wants to list files in the current repository directory.';
  const candidates = ['search_web', 'list_dir', 'execute_code', 'generate_image'];
  const decision = await nanoJevEngine.evaluateDecisions(state, candidates);
  console.log('[TEST] Decision Result:', decision);

  assert.strictEqual(decision.selected, 'list_dir', 'list_dir should be selected for directory listing state');
  assert.ok(decision.confidence > 0.5, 'confidence should be significant');
  assert.ok(decision.probabilities['list_dir'] > decision.probabilities['search_web'], 'list_dir prob should be highest');
  assert.strictEqual(candidates.length, Object.keys(decision.probabilities).length);

  // 3. HITL Prediction test
  const safePrediction = await nanoJevEngine.predictHitlApproval('read_file', { path: 'README.md' });
  console.log('[TEST] Safe Action Prediction:', safePrediction);
  assert.strictEqual(safePrediction.requiresConfirmation, false);

  const destructivePrediction = await nanoJevEngine.predictHitlApproval('delete_file', { path: 'important.db' });
  console.log('[TEST] Destructive Action Prediction:', destructivePrediction);
  assert.strictEqual(destructivePrediction.requiresConfirmation, true);
  assert.ok(destructivePrediction.confidence > 0.7);

  console.log('[TEST] All NanoJev Engine tests passed successfully! ✓');
}

testNanoJevEngine().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
