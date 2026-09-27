// Test Suite for LoRA Fine-Tuning Engine
const assert = require('assert');

async function run() {
  console.log('🧪 Starting LoRA Fine-Tuning Engine Test Suite...\n');

  // Dynamic import of TypeScript engine
  const { loraFineTuningEngine } = await import('../lib/ai/loraFineTuningEngine.ts');

  // Test 1: Workspace Dataset Harvesting
  console.log('1. Testing AST Dataset Harvester...');
  const sampleFiles = [
    {
      path: 'lib/rateLimiter.ts',
      content: `
/**
 * Thread-safe Token Bucket Rate Limiter
 * Implements token bucket algorithm with configurable refill rate and burst capacity.
 */
export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRate: number;
  private tokens: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
  }

  public tryConsume(tokens: number = 1): boolean {
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
}
      `
    },
    {
      path: 'lib/interfaces.ts',
      content: `
export interface UserSession {
  id: string;
  userId: string;
  expiresAt: number;
  roles: string[];
}

export function validateSession(session: UserSession): boolean {
  return session.expiresAt > Date.now();
}
      `
    }
  ];

  const harvestedDataset = loraFineTuningEngine.harvestWorkspaceDataset(sampleFiles);
  console.log(`   Harvested ${harvestedDataset.length} JSONL dataset pairs.`);
  assert(harvestedDataset.length >= 2, 'Should harvest at least 2 dataset pairs from sample files');
  assert(harvestedDataset[0].instruction.length > 5, 'Instruction should be non-empty');
  assert(harvestedDataset[0].output.length > 20, 'Output code should be non-empty');
  console.log('   ✅ Dataset harvesting assertions passed.');

  // Test 2: Training Execution & Loss Telemetry
  console.log('\n2. Testing Training Execution & Loss Convergence...');
  const config = {
    baseModel: 'qwen2.5-coder:1.5b',
    loraRank: 16,
    loraAlpha: 32,
    loraDropout: 0.05,
    targetModules: ['q_proj', 'v_proj', 'k_proj', 'o_proj'],
    quantization: '4bit_qlora_nf4',
    learningRate: 0.0002,
    epochs: 3,
    batchSize: 4,
    gradientAccumulationSteps: 2,
    datasetSegments: ['apis', 'schemas', 'logic'],
    systemPrompt: 'You are an expert offline AI coding assistant specialized in TypeScript.'
  };

  const report = await loraFineTuningEngine.executeTrainingRun(config, harvestedDataset);
  console.log(`   Job ID: ${report.jobId}`);
  console.log(`   Total Steps: ${report.metrics.totalSteps}`);
  console.log(`   Initial Loss: ${report.metrics.initialLoss.toFixed(4)} -> Final Loss: ${report.metrics.finalLoss.toFixed(4)}`);
  console.log(`   Initial Perplexity: ${report.metrics.initialPerplexity.toFixed(2)} -> Final Perplexity: ${report.metrics.finalPerplexity.toFixed(2)}`);
  console.log(`   Peak VRAM: ${report.metrics.vramPeakGb} GB`);

  assert(report.status === 'completed', 'Job status should be completed');
  assert(report.lossCurve.length > 10, 'Loss curve should have multiple telemetry steps');
  assert(report.metrics.finalLoss < report.metrics.initialLoss, 'Final loss must be strictly lower than initial loss');
  assert(report.metrics.finalPerplexity < report.metrics.initialPerplexity, 'Final perplexity must be strictly lower than initial perplexity');
  console.log('   ✅ Training convergence assertions passed.');

  // Test 3: Modelfile and PEFT Config Synthesis
  console.log('\n3. Testing Ollama Modelfile and PEFT Config Synthesis...');
  const modelfile = report.modelfile;
  assert(modelfile.includes('FROM qwen2.5-coder:1.5b'), 'Modelfile must contain base model FROM directive');
  assert(modelfile.includes('ADAPTER ./lora_adapters/'), 'Modelfile must contain ADAPTER directive');
  assert(modelfile.includes('SYSTEM """You are an expert offline AI coding assistant'), 'Modelfile must contain custom SYSTEM prompt');

  const peftConfig = JSON.parse(report.adapterConfigJson);
  assert.strictEqual(peftConfig.r, 16, 'PEFT config rank should match');
  assert.strictEqual(peftConfig.lora_alpha, 32, 'PEFT config alpha should match');
  assert.deepStrictEqual(peftConfig.target_modules, ['q_proj', 'v_proj', 'k_proj', 'o_proj'], 'PEFT target modules should match');
  console.log('   ✅ Modelfile and PEFT configuration assertions passed.');

  // Test 4: Side-by-Side Comparison Generator
  console.log('\n4. Testing Side-by-Side Inference Evaluator...');
  const comparison = await loraFineTuningEngine.evaluateComparison(
    'Create a function that calculates SHA-256 hash',
    config.baseModel,
    report.jobId
  );
  console.log(`   Base Model Output length: ${comparison.baseOutput.length}`);
  console.log(`   Adapted Model Output length: ${comparison.adapterOutput.length}`);
  assert(comparison.baseOutput.length > 20, 'Base output should be non-empty');
  assert(comparison.adapterOutput.length > 20, 'Adapter output should be non-empty');
  console.log('   ✅ Side-by-Side evaluation assertions passed.');

  console.log('\n🎉 ALL LORA FINE-TUNING ENGINE TESTS PASSED CLEANLY!\n');
}

run().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
