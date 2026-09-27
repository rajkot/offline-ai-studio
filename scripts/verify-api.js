async function verify() {
  const payload = {
    query: 'BrowserAgentEngine',
    activeFile: 'app/test.ts',
    files: {
      'lib/ai/browserAgentEngine.ts': 'export class BrowserAgentEngine {\n  auditPage() {}\n}',
      'app/test.ts': 'import { BrowserAgentEngine } from "./lib/ai/browserAgentEngine";\nexport const run = () => {\n  const b = new BrowserAgentEngine();\n  b.auditPage();\n};'
    }
  };

  const res = await fetch('http://localhost:3000/api/rag/semantic-graph-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('✅ API Route Status:', data.success);
  console.log('✅ Extracted Nodes Count:', data.nodes.length);
  console.log('✅ Extracted Edges Count:', data.edges.length);
  console.log('✅ Matched Symbol IDs:', data.matchedNodeIds);
  console.log('✅ Graph-RAG Context for app/test.ts:\n' + data.graphRagContext);
  console.log('✅ Graph Stats:', data.stats);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
