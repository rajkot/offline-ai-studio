/**
 * Verification test for Cline & Roo Code Autonomous Protocol Engine
 */
const { clineProtocolEngine } = require('../lib/ai/clineProtocolEngine');

async function runTests() {
  console.log('🧪 Starting Cline Protocol Engine Tests...\n');
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

  // 1. Available Modes
  const modes = clineProtocolEngine.getAvailableModes();
  assert(modes.length >= 4, `Available modes contains at least 4 modes (found ${modes.length})`);
  const modeSlugs = modes.map(m => m.slug);
  assert(modeSlugs.includes('code'), 'Contains "code" mode');
  assert(modeSlugs.includes('architect'), 'Contains "architect" mode');
  assert(modeSlugs.includes('ask'), 'Contains "ask" mode');
  assert(modeSlugs.includes('debug'), 'Contains "debug" mode');

  // 2. System Prompts
  const architectPrompt = clineProtocolEngine.getSystemPromptForMode('architect');
  assert(architectPrompt.includes('ARCHITECT'), 'Architect prompt contains ARCHITECT role instructions');
  assert(architectPrompt.includes('read_file'), 'Architect prompt documents tool calling format');

  // 3. XML Tool Call Parser
  const sampleOutput = `
I will inspect the workspace files and run the test suite.
<read_file>
<path>src/index.ts</path>
</read_file>

Now let's run the tests:
<execute_command>
<command>npm test</command>
</execute_command>
  `;

  const toolCalls = clineProtocolEngine.parseClineXmlToolCalls(sampleOutput);
  assert(toolCalls.length === 2, `Parsed 2 tool calls from sample output (found ${toolCalls.length})`);
  assert(toolCalls[0].name === 'read_file', 'First tool call is read_file');
  assert(toolCalls[0].parameters.path === 'src/index.ts', 'First tool call path is src/index.ts');
  assert(toolCalls[1].name === 'execute_command', 'Second tool call is execute_command');
  assert(toolCalls[1].parameters.command === 'npm test', 'Second tool call command is npm test');

  // 4. Inline attribute format tool call
  const inlineAttrOutput = `
<write_to_file path="src/newFile.ts">
<content>
export const hello = "world";
</content>
</write_to_file>
  `;
  const writeCalls = clineProtocolEngine.parseClineXmlToolCalls(inlineAttrOutput);
  assert(writeCalls.length === 1, 'Parsed 1 write_to_file tool call');
  assert(writeCalls[0].parameters.path === 'src/newFile.ts', 'Target path matches');
  assert(writeCalls[0].parameters.content.includes('export const hello'), 'Content parsed accurately');

  // 5. Permission Enforcement
  const defaultPerms = clineProtocolEngine.getDefaultPermissions();
  const readPerm = clineProtocolEngine.checkPermission(toolCalls[0], defaultPerms);
  assert(readPerm.allowed === true && readPerm.requiresConfirmation === false, 'read_file is auto-allowed');

  const execPerm = clineProtocolEngine.checkPermission(toolCalls[1], defaultPerms);
  assert(execPerm.allowed === true && execPerm.requiresConfirmation === true, 'execute_command requires confirmation in default mode');

  // Dangerous command check
  const dangerousCall = {
    name: 'execute_command',
    parameters: { command: 'rm -rf /' }
  };
  const dangerPerm = clineProtocolEngine.checkPermission(dangerousCall, defaultPerms);
  assert(dangerPerm.allowed === false, 'Dangerous command rm -rf / is blocked outright');

  // 6. Format Tool Result
  const resultXml = clineProtocolEngine.formatToolResult('read_file', 'console.log("hello");');
  assert(resultXml.includes('<tool_result name="read_file">'), 'Formatted tool result includes opening tag');
  assert(resultXml.includes('console.log("hello");'), 'Formatted tool result includes content');

  console.log(`\n🎉 All ${passed}/${total} tests PASSED!`);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
