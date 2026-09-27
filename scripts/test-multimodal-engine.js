// Test Suite for Multimodal Autonomous AI Builder Engine
const assert = require('assert');

async function run() {
  console.log('🧪 Starting Multimodal Autonomous AI Builder Test Suite...\n');

  const { multimodalVoiceAgentEngine } = await import('../lib/ai/multimodalVoiceAgentEngine.ts');

  // Test 1: Voice Intent Parsing
  console.log('1. Testing Voice Intent Parsing...');
  const testPhrases = [
    { text: 'Create a new UserProfileCard component with dark mode and edit buttons', expectedAction: 'generate', expectedComponent: 'UserProfileCard' },
    { text: 'Refactor this active file to use TypeScript strict types and memoization', expectedAction: 'refactor' },
    { text: 'Fix the null pointer bug on line 42', expectedAction: 'fix' },
    { text: 'Generate unit tests for the token bucket rate limiter', expectedAction: 'test' }
  ];

  for (const phrase of testPhrases) {
    const parsed = multimodalVoiceAgentEngine.parseVoiceIntent(phrase.text, 'components/Card.tsx');
    console.log(`   Speech: "${phrase.text.slice(0, 45)}..." -> Action: ${parsed.action}`);
    assert.strictEqual(parsed.action, phrase.expectedAction, `Intent action must match ${phrase.expectedAction}`);
    if (phrase.expectedComponent) {
      assert.strictEqual(parsed.targetComponent, phrase.expectedComponent, `Component name must match ${phrase.expectedComponent}`);
    }
  }
  console.log('   ✅ Voice intent parsing assertions passed.');

  // Test 2: Voice-to-Code Synthesis
  console.log('\n2. Testing Voice-to-Code Synthesis...');
  const voiceCommand = 'Create a responsive AnalyticsSummaryCard component with metric stats and lucide icons';
  const buildResult = await multimodalVoiceAgentEngine.executeVoiceCommand(
    voiceCommand,
    'components/AnalyticsSummaryCard.tsx'
  );

  console.log(`   Success: ${buildResult.success}`);
  console.log(`   Target File: ${buildResult.suggestedFilePath}`);
  console.log(`   Code Lines: ${buildResult.synthesizedCode.split('\n').length}`);
  console.log(`   Execution Time: ${buildResult.executionTimeMs}ms`);

  assert(buildResult.success === true, 'Voice build must succeed');
  assert(buildResult.synthesizedCode.length > 50, 'Synthesized code should be substantial');
  assert(buildResult.synthesizedCode.includes('export default function'), 'Synthesized code must contain export component');
  console.log('   ✅ Voice-to-code synthesis assertions passed.');

  // Test 3: Multimodal Vision-to-Code Synthesis
  console.log('\n3. Testing Multimodal Vision-to-Code Synthesis...');
  const visionResult = await multimodalVoiceAgentEngine.synthesizeFromVision({
    layoutType: 'dashboard',
    framework: 'react_tailwind',
    componentName: 'LiveMetricsWidget',
    promptDirective: 'Card with revenue stats, active user count, and latency meter'
  });

  console.log(`   Success: ${visionResult.success} | Component: ${visionResult.componentName}`);
  console.log(`   Elements Detected: [${visionResult.elementsDetected.join(', ')}]`);
  console.log(`   Code Lines: ${visionResult.synthesizedCode.split('\n').length}`);

  assert(visionResult.success === true, 'Vision synthesis must succeed');
  assert.strictEqual(visionResult.componentName, 'LiveMetricsWidget', 'Component name should match');
  assert(visionResult.elementsDetected.length >= 2, 'Should detect key layout elements');
  assert(visionResult.synthesizedCode.includes('LiveMetricsWidget'), 'Component definition must be present');
  console.log('   ✅ Multimodal vision-to-code synthesis assertions passed.');

  console.log('\n🎉 ALL MULTIMODAL AUTONOMOUS AI BUILDER TESTS PASSED CLEANLY!\n');
}

run().catch(err => {
  console.error('❌ Multimodal test suite failed:', err);
  process.exit(1);
});
