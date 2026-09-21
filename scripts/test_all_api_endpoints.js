const http = require('http');

async function testRoute(name, url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url, 'http://localhost:3000');
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          name,
          url,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
          preview: data.slice(0, 150)
        });
      });
    });

    req.on('error', (err) => {
      resolve({ name, url, status: 'ERROR', error: err.message, ok: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ name, url, status: 'TIMEOUT', ok: false });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('Testing all API endpoints against http://localhost:3000...\n');

  const tests = [
    // 1. Ollama & Models
    () => testRoute('Ollama Status', '/api/ollama/status'),
    () => testRoute('Ollama Generate', '/api/ollama/generate', 'POST', { model: 'qwen2.5:1.5b', prompt: 'ping' }),
    () => testRoute('HuggingFace Models Catalog', '/api/models/huggingface?limit=5'),
    
    // 2. Core Pipelines
    () => testRoute('Pipeline Autocomplete', '/api/pipeline/autocomplete', 'POST', { prefix: 'function add(', suffix: '}' }),
    () => testRoute('Pipeline Fix Terminal Error', '/api/pipeline/fix-terminal-error', 'POST', { errorLog: 'ReferenceError: foo is not defined', filePath: 'test.ts' }),
    () => testRoute('Pipeline Guardrails Sanitize', '/api/pipeline/guardrails/sanitize', 'POST', { prompt: 'Hello 192.168.1.1 test@example.com' }),
    () => testRoute('Pipeline Audit Logs', '/api/pipeline/guardrails/audit-logs'),
    () => testRoute('Pipeline Audit Grounding', '/api/pipeline/guardrails/audit-grounding', 'POST', { text: 'Here is verified code: App.tsx' }),
    () => testRoute('Pipeline Translate', '/api/pipeline/translate', 'POST', { code: '// Check database connection\nfunction check() {}', targetLang: 'es' }),

    // 3. RAG & Graph
    () => testRoute('RAG Stats', '/api/rag/stats'),
    () => testRoute('RAG Hybrid Search', '/api/rag/hybrid-search', 'POST', { query: 'monaco editor' }),
    () => testRoute('RAG Semantic Graph Search', '/api/rag/semantic-graph-search', 'POST', { query: 'theme' }),
    () => testRoute('RAG Rebuild', '/api/rag/rebuild', 'POST'),

    // 4. Optimizer & Swarm
    () => testRoute('Optimizer Status', '/api/optimizer/status'),
    () => testRoute('Optimizer Flush', '/api/optimizer/flush', 'POST'),
    () => testRoute('Swarm Status', '/api/swarm/status'),

    // 5. Scaffolder & Composer
    () => testRoute('Scaffolder Plan', '/api/scaffolder/plan', 'POST', { template: 'nextjs', name: 'my-app' }),
    () => testRoute('Composer Generate', '/api/composer/generate', 'POST', { prompt: 'Create auth module' }),

    // 6. Tools & Evaluations
    () => testRoute('Evaluator Verify', '/api/evaluator/verify', 'POST', { code: 'console.log("ok");' }),
    () => testRoute('Prompts List', '/api/prompts'),
    () => testRoute('TDD Run', '/api/tdd/run', 'POST', { testCode: 'describe("math", () => { it("adds", () => {}); });' }),

    // 7. Operations & FinOps
    () => testRoute('FinOps Usage', '/api/finops/usage'),
    () => testRoute('Profiler Start', '/api/profiler/start', 'POST'),
    () => testRoute('Diagnostics Export', '/api/diagnostics/export', 'POST', { systemInfo: { os: 'windows' } }),
    () => testRoute('Release Package', '/api/release/package', 'POST', { target: 'zip' }),
    () => testRoute('Desktop Generate EXE', '/api/desktop/generate-exe', 'POST')
  ];

  const results = [];
  let failed = 0;

  for (const fn of tests) {
    const r = await fn();
    results.push(r);
    const symbol = r.ok ? '✅' : '❌';
    console.log(`${symbol} [${r.status}] ${r.name.padEnd(32)} -> ${r.url}`);
    if (!r.ok) {
      console.log(`    Error/Preview: ${r.error || r.preview}`);
      failed++;
    }
  }

  console.log(`\n================================`);
  console.log(`API Audit Complete: ${results.length - failed}/${results.length} PASSED. ${failed} FAILED.`);
  console.log(`================================`);
}

run();
