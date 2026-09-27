const assert = require('assert');

async function testUiTarsEngine() {
  console.log('[TEST] Checking UI-TARS Computer-Use Action & Coordinate Engine...');

  const { uiTarsEngine, UiTarsEngine } = require('../lib/ai/uiTarsEngine');
  assert.ok(uiTarsEngine, 'uiTarsEngine singleton should exist');
  assert.ok(UiTarsEngine, 'UiTarsEngine class should be exported');

  // Test 1: Action Grammar Parsing
  console.log('[TEST] Testing action grammar parsing...');

  // 1a: Click action
  const clickOutput = 'Thought: The login button is located in the middle. Action: click(point=[480, 620])';
  const parsedClick = uiTarsEngine.parseAction(clickOutput);
  assert.strictEqual(parsedClick.action, 'click');
  assert.deepStrictEqual(parsedClick.point, [480, 620]);
  assert.ok(parsedClick.thought.includes('The login button'));

  // 1b: Type action
  const typeOutput = 'Action: type(content="offline-ai-studio")';
  const parsedType = uiTarsEngine.parseAction(typeOutput);
  assert.strictEqual(parsedType.action, 'type');
  assert.strictEqual(parsedType.content, 'offline-ai-studio');

  // 1c: Hotkey action
  const hotkeyOutput = 'Action: hotkey(key="ctrl+s")';
  const parsedHotkey = uiTarsEngine.parseAction(hotkeyOutput);
  assert.strictEqual(parsedHotkey.action, 'hotkey');
  assert.strictEqual(parsedHotkey.key, 'ctrl+s');

  // 1d: Finished action
  const finishOutput = 'Action: finished()';
  const parsedFinish = uiTarsEngine.parseAction(finishOutput);
  assert.strictEqual(parsedFinish.action, 'finished');

  // Test 2: Coordinate Normalization [0..1000] -> Screen Pixels
  console.log('[TEST] Testing coordinate scaling from normalized space to display pixels...');
  const centerScaled = uiTarsEngine.scaleCoordinates([500, 500], 1920, 1080);
  assert.deepStrictEqual(centerScaled, [960, 540], 'Center [500, 500] should map to [960, 540] on 1080p');

  const cornerScaled = uiTarsEngine.scaleCoordinates([1000, 1000], 2560, 1440);
  assert.deepStrictEqual(cornerScaled, [2560, 1440], 'Corner [1000, 1000] should map to max resolution');

  // Test 3: Safety Guard Verification
  console.log('[TEST] Testing destructive desktop command safety policy...');
  const safeAction = { action: 'hotkey', key: 'ctrl+c' };
  const safeCheck = uiTarsEngine.validateActionSafety(safeAction);
  assert.strictEqual(safeCheck.safe, true, 'Safe hotkey should be allowed');

  const unsafeAction = { action: 'hotkey', key: 'alt+f4' };
  const unsafeCheck = uiTarsEngine.validateActionSafety(unsafeAction);
  assert.strictEqual(unsafeCheck.safe, false, 'alt+f4 must be blocked by safety policy');

  const destructiveType = { action: 'type', content: 'format C: /y' };
  const destructiveCheck = uiTarsEngine.validateActionSafety(destructiveType);
  assert.strictEqual(destructiveCheck.safe, false, 'Destructive format command must be blocked');

  console.log('[TEST] All UI-TARS Engine unit tests passed successfully! ✓');
}

testUiTarsEngine().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
