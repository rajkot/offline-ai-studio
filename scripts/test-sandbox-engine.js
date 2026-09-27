// Test Suite for Isolated Execution Guard & Sandbox Engine
const assert = require('assert');

async function run() {
  console.log('🧪 Starting Isolated Execution Guard Test Suite...\n');

  const { isolatedExecutionGuard } = await import('../lib/sandbox/isolatedExecutionGuard.ts');

  // Test 1: Standard Safe Code Execution & Console Interception
  console.log('1. Testing Safe Code Execution & Console Capture...');
  const safeCode = `
    console.log("Starting calculation");
    function fib(n) {
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
    }
    const result = fib(10);
    console.log("Fibonacci result:", result);
    result;
  `;
  const result1 = await isolatedExecutionGuard.runInSandbox({
    code: safeCode,
    timeoutMs: 2000
  });

  console.log(`   Success: ${result1.success} | Return: ${result1.returnValue} | Time: ${result1.executionTimeMs}ms`);
  console.log(`   Captured Logs: ${result1.logs.length}`);
  assert(result1.success === true, 'Execution should succeed');
  assert.strictEqual(result1.returnValue, 55, 'Fibonacci(10) should equal 55');
  assert(result1.logs.length >= 2, 'Should capture at least 2 console logs');
  console.log('   ✅ Safe execution and console capture passed.');

  // Test 2: Timeout Enforcement (Infinite Loop Abortion)
  console.log('\n2. Testing Timeout Circuit Breaker on Infinite Loop...');
  const infiniteLoopCode = `
    let counter = 0;
    while (true) {
      counter++;
    }
  `;
  const result2 = await isolatedExecutionGuard.runInSandbox({
    code: infiniteLoopCode,
    timeoutMs: 500
  });

  console.log(`   Success: ${result2.success} | TimedOut: ${result2.timedOut} | Error: ${result2.error}`);
  assert(result2.success === false, 'Infinite loop execution must fail');
  assert(result2.timedOut === true, 'Result timedOut flag must be true');
  assert(result2.executionTimeMs >= 400, 'Execution time should be around timeout window');
  console.log('   ✅ Timeout circuit breaker passed.');

  // Test 3: Prototype Pollution Isolation Defense
  console.log('\n3. Testing Prototype Pollution Containment...');
  const attackCode = `
    try {
      Object.prototype.pollutedExploit = "CRITICAL_SECURITY_BREACH";
    } catch (e) {
      console.warn("Pollution attempt blocked by frozen prototype:", e.message);
    }
    Object.prototype.pollutedExploit;
  `;
  const result3 = await isolatedExecutionGuard.runInSandbox({
    code: attackCode,
    timeoutMs: 1000
  });

  // Verify host Object prototype was NOT polluted
  const hostIsPolluted = (Object.prototype).pollutedExploit !== undefined;
  console.log(`   Host Process Polluted: ${hostIsPolluted}`);
  assert.strictEqual(hostIsPolluted, false, 'Host Object prototype must never be polluted');
  console.log('   ✅ Prototype pollution defense passed.');

  // Test 4: Command Safety Heuristic Scanner
  console.log('\n4. Testing Shell Command Safety Inspector...');
  const dangerousCommands = [
    'rm -rf /',
    'rmdir /s /q C:\\Windows',
    'del /f /s /q *.*',
    ':(){ :|:& };:',
    'dd if=/dev/zero of=/dev/sda',
    'format c: /fs:ntfs'
  ];

  for (const cmd of dangerousCommands) {
    const inspection = isolatedExecutionGuard.inspectCommand(cmd);
    console.log(`   Command: "${cmd}" -> Status: ${inspection.status} (Score: ${inspection.riskScore})`);
    assert.strictEqual(inspection.status, 'BLOCKED', `Destructive command "${cmd}" must be BLOCKED`);
    assert(inspection.riskScore >= 90, `Risk score should be >= 90 for "${cmd}"`);
  }

  const safeCommands = [
    'npm run dev',
    'git status',
    'node scripts/test.js',
    'npm install lodash',
    'tsc --noEmit'
  ];

  for (const cmd of safeCommands) {
    const inspection = isolatedExecutionGuard.inspectCommand(cmd);
    console.log(`   Command: "${cmd}" -> Status: ${inspection.status} (Score: ${inspection.riskScore})`);
    assert.strictEqual(inspection.status, 'SAFE', `Harmless command "${cmd}" should be SAFE`);
    assert(inspection.riskScore <= 30, `Risk score should be <= 30 for "${cmd}"`);
  }

  console.log('   ✅ Command safety policy inspector passed.');

  console.log('\n🎉 ALL ISOLATED EXECUTION GUARD TESTS PASSED CLEANLY!\n');
}

run().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
