const http = require('http');
const assert = require('assert');

async function runSmartMacroE2ETest() {
  console.log('[E2E TEST] Starting Smart Macro & Web Form Auto-Filler End-to-End Suite...');

  const submittedLeads = [];
  const PORT = 3899;

  // 1. Create a mock local CRM Lead Form HTTP Server
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Mock CRM Lead Entry</title></head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h2>Enter New Customer Lead</h2>
          <form id="crmForm" action="/submit" method="POST">
            <p>
              <label for="name">Contact Name:</label><br/>
              <input type="text" id="name" name="lead_name" placeholder="Enter Full Name" />
            </p>
            <p>
              <label for="phone">Mobile Phone:</label><br/>
              <input type="tel" id="phone" name="lead_phone" placeholder="Mobile Number" />
            </p>
            <p>
              <label for="city">City:</label><br/>
              <input type="text" id="city" name="lead_city" placeholder="City / Region" />
            </p>
            <p>
              <button type="submit" id="submit_lead">Save CRM Lead</button>
            </p>
          </form>
        </body>
        </html>
      `);
      return;
    }

    if (req.method === 'POST' && req.url === '/submit') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        submittedLeads.push(body);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h3>Lead Saved Successfully!</h3><a href="/">Add Another</a>');
      });
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`[E2E TEST] Mock CRM Server listening at http://localhost:${PORT}`);

  try {
    const { smartMacroEngine } = require('../lib/automation/smartMacroEngine');

    // 2. Test Page Inspection
    console.log('[E2E TEST] Inspecting DOM elements via SmartMacroEngine...');
    const elements = await smartMacroEngine.inspectPageElements(`http://localhost:${PORT}/`);
    console.log(`[E2E TEST] Extracted ${elements.length} interactive elements.`);
    assert.ok(elements.length >= 4, 'Should extract at least 4 form elements');

    // 3. Test NanoJev Semantic Element Matching
    console.log('[E2E TEST] Testing NanoJev semantic candidate selection...');
    const matchName = await smartMacroEngine.matchElementWithNanoJev('Contact Name', elements);
    assert.strictEqual(matchName.bestCandidate.id, 'name', 'Should resolve Contact Name to input#name');

    const matchPhone = await smartMacroEngine.matchElementWithNanoJev('Mobile Phone', elements);
    assert.strictEqual(matchPhone.bestCandidate.id, 'phone', 'Should resolve Mobile Phone to input#phone');

    const matchSubmit = await smartMacroEngine.matchElementWithNanoJev('Save CRM Lead', elements);
    assert.strictEqual(matchSubmit.bestCandidate.id, 'submit_lead', 'Should resolve Submit to button#submit_lead');

    console.log('[E2E TEST] NanoJev Semantic Match verification passed! ✓');

    // 4. Test Macro Execution on Mock Dataset
    console.log('[E2E TEST] Executing 2-row batch macro...');
    const testMacro = {
      id: 'e2e-crm-macro',
      name: 'E2E CRM Lead Automation',
      targetUrl: `http://localhost:${PORT}/`,
      mode: 'browser',
      steps: [
        { id: 's1', action: 'navigate' },
        { id: 's2', action: 'smartFill', targetIntent: 'Contact Name', csvField: 'name', value: '{{csv.name}}' },
        { id: 's3', action: 'smartFill', targetIntent: 'Mobile Phone', csvField: 'phone', value: '{{csv.phone}}' },
        { id: 's4', action: 'smartFill', targetIntent: 'City', csvField: 'city', value: '{{csv.city}}' },
        { id: 's5', action: 'smartClick', targetIntent: 'Save CRM Lead' }
      ],
      csvData: [
        { name: 'Rajesh Patel', phone: '9825012345', city: 'Surat' },
        { name: 'Priya Joshi', phone: '9876543210', city: 'Ahmedabad' }
      ]
    };

    const progressLogs = [];
    const runResult = await smartMacroEngine.executeMacro(testMacro, (event) => {
      progressLogs.push(event.message);
    });

    console.log('[E2E TEST] Macro Execution Result:', runResult);
    assert.strictEqual(runResult.success, true, 'Macro batch should execute with success: true');
    assert.strictEqual(runResult.totalProcessed, 2, 'Should process all 2 rows');
    assert.strictEqual(runResult.errors.length, 0, 'Should have 0 errors');
    assert.strictEqual(submittedLeads.length, 2, 'Mock CRM server should receive 2 submitted forms');

    console.log('[E2E TEST] Submitted leads payload count:', submittedLeads.length);
    console.log('[E2E TEST] All End-to-End checks passed successfully! ✓');
  } finally {
    server.close();
    console.log('[E2E TEST] Mock Server closed.');
  }
}

runSmartMacroE2ETest().catch((err) => {
  console.error('[E2E TEST FAILED]', err);
  process.exit(1);
});
