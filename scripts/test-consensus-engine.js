const assert = require('assert');

async function runTests() {
  console.log('🧪 Starting Multi-Agent Consensus Triad Test Suite...');

  const { MultiAgentConsensusEngine } = require('../lib/ai/multiAgentConsensusEngine');
  const engine = new MultiAgentConsensusEngine();

  const prompt = 'Implement a zero-dependency LRU cache class with max capacity and TTL expiration';
  const activeFile = 'lib/lruCache.ts';
  const initialContent = '// Initial empty file\nexport class LRUCache {}';

  console.log('1. Launching consensus debate session...');
  const result = await engine.runConsensusSession({
    prompt,
    activeFile,
    initialContent,
    workspaceFiles: { [activeFile]: initialContent },
    maxIterations: 3
  });

  console.log(`   Session completed in iteration ${result.iteration} with verdict: ${result.overallVerdict}`);
  console.log(`   Consensus Score: ${result.consensusScore}% | Status: ${result.status}`);
  console.log(`   Total Agents Participating: ${result.agents.length}`);

  console.log('2. Verifying Agent Roster & Roles...');
  const architect = result.agents.find(a => a.id === 'architect');
  const implementer = result.agents.find(a => a.id === 'implementer');
  const reviewer = result.agents.find(a => a.id === 'reviewer');
  const auditor = result.agents.find(a => a.id === 'auditor');

  assert(architect, 'Architect agent must be present');
  assert(implementer, 'Implementer agent must be present');
  assert(reviewer, 'Reviewer agent must be present');
  assert(auditor, 'Auditor agent must be present');

  assert(architect.status === 'completed', 'Architect should be completed');
  assert(implementer.status === 'completed', 'Implementer should be completed');
  assert(reviewer.status === 'completed', 'Reviewer should be completed');
  assert(auditor.status === 'completed', 'Auditor should be completed');

  console.log('3. Verifying Spec & Invariants from Architect...');
  assert(result.specSummary && result.specSummary.length > 20, 'Architect must generate a detailed spec');
  console.log(`   Spec Preview: "${result.specSummary.slice(0, 80)}..."`);

  console.log('4. Verifying Code Implementation & Consensus...');
  assert(result.consensusCode && result.consensusCode.length > 50, 'Implementer must produce working code');
  assert(result.consensusCode.includes('class') || result.consensusCode.includes('function'), 'Code should define class or function');
  assert(result.consensusScore >= 80, `Expected consensus score >= 80%, got ${result.consensusScore}%`);
  assert(result.status === 'agreed', 'Expected status to be agreed');

  console.log('5. Verifying Reviewer & Auditor Votes...');
  assert(reviewer.vote === 'approved' || reviewer.vote === 'needs_revision', 'Reviewer must cast valid vote');
  assert(auditor.vote === 'approved', 'Auditor must approve secure code');

  console.log('✅ ALL MULTI-AGENT CONSENSUS TESTS PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
