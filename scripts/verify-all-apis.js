const endpoints = [
  { name: 'Awesome LLM Apps', path: '/api/awesome-llm-apps' },
  { name: 'Agency Agents', path: '/api/agency-agents' },
  { name: 'Scientific Skills', path: '/api/scientific-skills' },
  { name: 'OpenJarvis Engine', path: '/api/openjarvis' },
  { name: 'Strands Agents Tools', path: '/api/strands-tools' },
  { name: 'Codebase Memory MCP', path: '/api/mcp/codebase-memory' },
  { name: 'Ollama Status', path: '/api/ollama/status' },
  { name: 'System Optimizer', path: '/api/optimizer/status' },
  { name: 'RAG Stats', path: '/api/rag/stats' }
];

async function verifyAll() {
  console.log('=== RUNNING FULL-SPECTRUM IDE API HEALTH VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const res = await fetch('http://localhost:3000' + ep.path);
      const data = await res.json().catch(() => null);
      if (res.status === 200 && data) {
        console.log(`[PASS] (200 OK) ${ep.name.padEnd(25)} -> ${ep.path}`);
        passed++;
      } else {
        console.log(`[WARN] (${res.status}) ${ep.name.padEnd(25)} -> ${ep.path}`);
        failed++;
      }
    } catch (err) {
      console.log(`[FAIL] ${ep.name.padEnd(25)} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== RESULTS: ${passed} Passed, ${failed} Failed ===`);
}

verifyAll();
