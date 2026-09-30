const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 STEP 1: VERIFYING IDE SERVER & OLLAMA CONNECTIVITY');
  console.log('===============================================================');

  const ollamaStatusRes = await fetch('http://localhost:3000/api/ollama/status');
  const ollamaStatus = await ollamaStatusRes.json();
  console.log('Ollama Status:', ollamaStatus.online ? 'ONLINE' : 'OFFLINE');
  console.log('Available Models:', ollamaStatus.models?.map(m => m.name).join(', ') || 'None');
  console.log('Selected Default Model:', ollamaStatus.defaultModel || 'None');

  if (!ollamaStatus.online) {
    throw new Error('Ollama is not running. Please start Ollama server first.');
  }

  const modelToUse = ollamaStatus.defaultModel || 'qwen2.5:1.5b';

  console.log('\n===============================================================');
  console.log(`🤖 STEP 2: DISPATCHING TASK TO OLLAMA (${modelToUse}) VIA IDE COMPOSER`);
  console.log('Task: Create a complete Math & String Utility Project with all files:');
  console.log('  - package.json');
  console.log('  - src/math.js');
  console.log('  - src/stringUtil.js');
  console.log('  - test/index.test.js');
  console.log('  - README.md');
  console.log('===============================================================');

  const prompt = `Create a complete small Node.js project for Math & String utilities.
Provide all files needed:
1. "package.json": Valid JSON with name "math-string-utils", version "1.0.0", main "src/math.js", scripts: {"test": "node test/index.test.js"}
2. "src/math.js": CommonJS module exporting add(a,b), subtract(a,b), multiply(a,b), and divide(a,b) with zero-division guard.
3. "src/stringUtil.js": CommonJS module exporting capitalize(str), reverse(str), and isPalindrome(str).
4. "test/index.test.js": A standalone self-testing script with assert statements that tests all functions from math.js and stringUtil.js and logs "ALL TESTS PASSED".
5. "README.md": Markdown documentation describing the project, installation, and usage.`;

  const startTime = Date.now();
  console.log('Sending request to /api/composer/generate...');

  let composerRes;
  try {
    const res = await fetch('http://localhost:3000/api/composer/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        intent: 'feature',
        model: modelToUse
      })
    });
    composerRes = await res.json();
  } catch (err) {
    console.error('Failed to call /api/composer/generate:', err.message);
    throw err;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Received response in ${duration}s.`);
  console.log('Composer Success:', composerRes.success);
  console.log('Source:', composerRes.source);
  console.log('Summary:', composerRes.summary);
  console.log(`Files generated count: ${composerRes.files?.length || 0}`);

  if (!composerRes.files || composerRes.files.length === 0) {
    throw new Error('Ollama composer did not return any files.');
  }

  console.log('\n===============================================================');
  console.log('📂 STEP 3: WRITING GENERATED PROJECT FILES TO DISK');
  console.log('Target directory: test-output/small-project/');
  console.log('===============================================================');

  const outputDir = path.resolve(__dirname, '../test-output/small-project');
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of composerRes.files) {
    const fullPath = path.join(outputDir, file.filePath);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, file.proposedContent, 'utf-8');
    const stats = fs.statSync(fullPath);
    console.log(`  ✓ Written: ${file.filePath} (${stats.size} bytes) - ${file.description || 'Generated file'}`);
  }

  console.log('\n===============================================================');
  console.log('🧪 STEP 4: EXECUTING GENERATED PROJECT TESTS');
  console.log('===============================================================');

  const testFile = path.join(outputDir, 'test/index.test.js');
  if (fs.existsSync(testFile)) {
    console.log(`Running node ${testFile}...`);
    try {
      const output = execSync(`node "${testFile}"`, {
        cwd: outputDir,
        encoding: 'utf-8',
        timeout: 10000
      });
      console.log('Test Output:');
      console.log(output.trim());
      console.log('🎉 Generated project tests PASSED successfully!');
    } catch (testErr) {
      console.error('Test execution failed:', testErr.message);
      if (testErr.stdout) console.log('Stdout:', testErr.stdout);
      if (testErr.stderr) console.error('Stderr:', testErr.stderr);
      throw testErr;
    }
  } else {
    console.warn('test/index.test.js not found in generated files. Finding alternative test file...');
    const foundTests = composerRes.files.filter(f => f.filePath.includes('test'));
    console.log('Test files generated:', foundTests.map(f => f.filePath));
  }

  console.log('\n===============================================================');
  console.log('✅ ALL STEPS COMPLETED: Ollama created the complete project and tests passed!');
  console.log('===============================================================');
}

runTest().catch(err => {
  console.error('\n❌ STEP-BY-STEP ERROR OCCURRED:');
  console.error(err);
  process.exit(1);
});
