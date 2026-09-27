/**
 * Verification test for Void Fast Apply & Ghost Text Diff Engine
 */
const { voidFastApplyEngine } = require('../lib/ai/voidFastApplyEngine');

async function runTests() {
  console.log('🧪 Starting Void Fast Apply Engine Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`✅ PASSED: ${message}`);
    passed++;
  }

  // 1. Basic Hunk Computation
  const original = [
    'function add(a, b) {',
    '  return a + b;',
    '}',
    '',
    'function multiply(a, b) {',
    '  return a * b;',
    '}'
  ].join('\n');

  const modified = [
    'function add(a: number, b: number): number {',
    '  return a + b;',
    '}',
    '',
    'function multiply(a, b) {',
    '  return a * b;',
    '}'
  ].join('\n');

  const hunks = voidFastApplyEngine.computeHunks(original, modified);
  assert(hunks.length === 1, `Computed 1 diff hunk (found ${hunks.length})`);
  assert(hunks[0].lines.some(l => l.type === 'delete' && l.text.includes('function add(a, b)')), 'Hunk detects deleted line');
  assert(hunks[0].lines.some(l => l.type === 'insert' && l.text.includes('function add(a: number')), 'Hunk detects inserted line');

  // 2. Fast Apply Hunks
  const applyResult = voidFastApplyEngine.fastApply(original, hunks);
  assert(applyResult.conflicts.length === 0, 'No conflicts during fast apply');
  assert(applyResult.updatedContent === modified, 'Fast applied content matches modified content exactly');

  // 3. Unified Diff Generation
  const unified = voidFastApplyEngine.generateUnifiedDiff('src/math.ts', original, modified);
  assert(unified.includes('--- a/src/math.ts'), 'Unified diff includes original file header');
  assert(unified.includes('+++ b/src/math.ts'), 'Unified diff includes modified file header');
  assert(unified.includes('@@'), 'Unified diff includes hunk separator');
  assert(unified.includes('-function add(a, b) {'), 'Unified diff includes deleted line');
  assert(unified.includes('+function add(a: number, b: number): number {'), 'Unified diff includes added line');

  // 4. Ghost Text Extraction
  const prefix = 'const greeting = ';
  const full = 'const greeting = "Hello, Void Editor!";';
  const ghost = voidFastApplyEngine.extractGhostText(prefix, full);
  assert(ghost === '"Hello, Void Editor!";', 'Ghost text correctly extracts suffix');

  // 5. Accept Next Word (Partial Autocomplete)
  const partial = voidFastApplyEngine.acceptNextWord(ghost);
  assert(partial.acceptedWord === '"Hello,', 'Accepted first word with punctuation');
  assert(partial.remainingGhostText === ' Void Editor!";', 'Remaining ghost text preserved');

  console.log(`\n🎉 All ${passed}/${total} Void Fast Apply tests PASSED!`);
}

runTests().catch(err => {
  console.error('Fatal error during Void tests:', err);
  process.exit(1);
});
