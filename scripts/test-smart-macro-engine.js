const assert = require('assert');

async function testSmartMacroEngine() {
  console.log('[TEST] Checking Smart Macro Engine...');
  
  const { smartMacroEngine, SmartMacroEngine } = require('../lib/automation/smartMacroEngine');
  
  assert.ok(smartMacroEngine, 'smartMacroEngine singleton should exist');
  assert.ok(SmartMacroEngine, 'SmartMacroEngine class should be exported');

  // Test 1: Variable substitution
  console.log('[TEST] Testing template variable substitution...');
  const template = 'Full Name: {{csv.name}} | Phone: {{csv.phone}} | City: {{csv.city}}';
  const rowData = { name: 'Rajesh Patel', phone: '9876543210', city: 'Surat' };
  const substituted = smartMacroEngine.substituteVariables(template, rowData);
  assert.strictEqual(
    substituted,
    'Full Name: Rajesh Patel | Phone: 9876543210 | City: Surat',
    'Template variables should be correctly replaced'
  );

  // Test 2: Validation of macro structure
  console.log('[TEST] Testing macro definition validation...');
  const validMacro = {
    id: 'crm-test',
    name: 'CRM Test',
    description: 'Test Macro',
    targetUrl: 'http://localhost:3000',
    mode: 'browser',
    steps: [
      { id: 's1', action: 'navigate' },
      { id: 's2', action: 'smartFill', targetIntent: 'Full Name', value: '{{csv.name}}', csvField: 'name' }
    ]
  };
  const validation = smartMacroEngine.validateMacro(validMacro);
  assert.strictEqual(validation.valid, true, 'Valid macro should pass validation');

  const invalidMacro = { id: 'crm-bad', steps: [] };
  const badValidation = smartMacroEngine.validateMacro(invalidMacro);
  assert.strictEqual(badValidation.valid, false, 'Invalid macro should fail validation');

  // Test 3: Candidate Element Matching with NanoJev
  console.log('[TEST] Testing NanoJev semantic element selection...');
  const candidates = [
    {
      id: 'field_name',
      tagName: 'input',
      type: 'text',
      name: 'fullname',
      placeholder: 'Enter Full Name',
      ariaLabel: 'Full Name'
    },
    {
      id: 'field_phone',
      tagName: 'input',
      type: 'tel',
      name: 'phone',
      placeholder: 'Mobile Number',
      ariaLabel: 'Customer Mobile'
    },
    {
      id: 'btn_submit',
      tagName: 'button',
      type: 'submit',
      name: 'submit_btn',
      text: 'Save CRM Lead'
    }
  ];

  const matchPhone = await smartMacroEngine.matchElementWithNanoJev('Mobile Number', candidates);
  assert.ok(matchPhone, 'Match result should not be null');
  assert.strictEqual(matchPhone.bestCandidate.id, 'field_phone', 'NanoJev should pick the phone input');
  assert.ok(matchPhone.confidence > 0.6, 'Confidence should be significant');

  const matchSubmit = await smartMacroEngine.matchElementWithNanoJev('Save CRM Lead', candidates);
  assert.strictEqual(matchSubmit.bestCandidate.id, 'btn_submit', 'NanoJev should pick the submit button');

  console.log('[TEST] All Smart Macro Engine unit tests passed! ✓');
}

testSmartMacroEngine().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
