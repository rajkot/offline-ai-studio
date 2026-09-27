# Autonomous LoRA / QLoRA Local Adapter Studio & Dataset Synthesis Specification

## 1. Overview
Offline AI Studio IDE requires an autonomous **Fine-Tuning & LoRA / QLoRA Local Adapter Studio** enabling 100% offline, air-gapped domain adaptation of local open-weights models (e.g. `llama3.2:3b`, `qwen2.5-coder:1.5b`, `phi-3.5:mini`, `deepseek-coder:1.3b`).

This subsystem bridges:
1. **Workspace AST Dataset Harvester**: Extracts clean instruction/input/output JSONL datasets directly from local codebase files, TypeScript interfaces, functions, and unit tests.
2. **LoRA / QLoRA Hyperparameter Configuration**: Manages Rank ($r \in [4, 64]$), Alpha ($\alpha \in [8, 128]$), Dropout, Quantization (4-bit QLoRA NF4/FP4, 8-bit, 16-bit BF16), and Target Linear Modules (`q_proj`, `v_proj`, `k_proj`, `o_proj`, `gate_proj`).
3. **Training Telemetry & Convergence Engine**: Computes step-by-step loss reduction, perplexity ($e^{\text{loss}}$), gradient norm, learning rate decay schedules, and VRAM memory profiling.
4. **Adapter Export & Modelfile Generation**: Exports standard Hugging Face PEFT configs (`adapter_config.json`, `adapter_model.bin`), GGUF adapter format, and synthesizes 1-click Ollama `Modelfile` definitions (`ADAPTER ./lora_adapters/...`).
5. **Side-by-Side Inference Evaluator**: Compares base model output vs. fine-tuned adapter output side-by-side to verify domain-specific learning without catastrophic forgetting.

---

## 2. Architecture & Data Structures

### 2.1 JSONL Dataset Pair
```typescript
export interface DatasetPair {
  id: string;
  instruction: string;
  input: string;
  output: string;
  sourceFile?: string;
  category: 'api' | 'schema' | 'logic' | 'security';
  tokenCount: number;
}
```

### 2.2 LoRA Training Configuration
```typescript
export interface LoraTrainingConfig {
  baseModel: string;
  loraRank: number; // 4, 8, 16, 32, 64
  loraAlpha: number; // 8, 16, 32, 64
  loraDropout: number; // 0.05 - 0.2
  targetModules: string[]; // ['q_proj', 'v_proj', 'k_proj', 'o_proj']
  quantization: '4bit_qlora_nf4' | '8bit_int8' | '16bit_bf16';
  learningRate: number; // e.g. 0.0002
  epochs: number; // 1 - 10
  batchSize: number; // 1 - 16
  gradientAccumulationSteps: number;
  datasetSegments: string[];
  systemPrompt: string;
}
```

### 2.3 Live Training Telemetry
```typescript
export interface LossTelemetryStep {
  step: number;
  epoch: number;
  loss: number;
  perplexity: number;
  vramUsageGb: number;
  learningRate: number;
  gradNorm: number;
  timestamp: string;
}

export interface TrainingRunReport {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  config: LoraTrainingConfig;
  metrics: {
    totalSamples: number;
    datasetSizeBytes: number;
    totalSteps: number;
    initialLoss: number;
    finalLoss: number;
    initialPerplexity: number;
    finalPerplexity: number;
    vramPeakGb: number;
    elapsedSeconds: number;
  };
  lossCurve: LossTelemetryStep[];
  modelfile: string;
  adapterConfigJson: string;
  logs: string[];
}
```

---

## 3. Component Architecture

### 3.1 `lib/ai/loraFineTuningEngine.ts`
- **`harvestWorkspaceDataset(files: Array<{ path: string; content: string }>): DatasetPair[]`**: Parses TypeScript/JavaScript/Python source files using AST regex/tokenizer, extracting function contracts, typed interfaces, and API endpoints into Alpaca instruction-response pairs.
- **`executeTrainingRun(config: LoraTrainingConfig, dataset: DatasetPair[]): Promise<TrainingRunReport>`**: Simulates and executes step-by-step training with realistic numerical convergence mathematics, learning rate cosine annealing, perplexity descent, and VRAM monitoring.
- **`generateOllamaModelfile(config: LoraTrainingConfig, jobId: string): string`**: Synthesizes the exact Ollama `Modelfile` with `FROM`, `PARAMETER`, `SYSTEM`, and `ADAPTER` directives.
- **`generateAdapterConfig(config: LoraTrainingConfig): object`**: Synthesizes standard Hugging Face PEFT `adapter_config.json`.
- **`evaluateComparison(prompt: string, baseModel: string, adapterJobId: string): Promise<{ baseOutput: string; adapterOutput: string }>`**: Generates side-by-side comparison outputs.

### 3.2 API Routes
- `GET /api/training/dataset` & `POST /api/training/dataset`: Generates, previews, and updates workspace JSONL training pairs.
- `POST /api/training/start`: Initiates or queries fine-tuning runs with live telemetry.
- `POST /api/training/evaluate`: Compares prompt responses between base model and fine-tuned adapter.

### 3.3 UI: `client/views/FineTuningDashboard.tsx`
- **Tab 1: Dataset Studio**: Real-time sample count, JSONL preview, AST Auto-Harvest button, custom sample builder.
- **Tab 2: LoRA / QLoRA Hyperparameters**: Sliders for Rank, Alpha, Learning Rate, Epochs, Batch Size, 4-bit QLoRA toggle, and Target Modules checkboxes.
- **Tab 3: Training Monitor & Live Loss Curves**: Real-time SVG chart showing Loss and Perplexity decay curves, VRAM peak meter, step counter, and interactive terminal log stream.
- **Tab 4: Side-by-Side Evaluator & Export**: Dual Monaco/Markdown panels testing prompt generation with vs without adapter, and 1-click **"Export Modelfile & Register in Ollama"** button.

---

## 4. Verification & Testing Criteria
1. Automated test script `scripts/test-lora-engine.js` verifies:
   - AST dataset harvester generates $\ge 5$ valid Alpaca JSONL pairs from real workspace code files.
   - Training loop produces strictly decreasing smoothed loss steps ($L_{\text{final}} < L_{\text{initial}}$).
   - Perplexity descends properly ($e^{L_{\text{final}}} < e^{L_{\text{initial}}}$).
   - Synthesized Modelfile contains valid `FROM`, `ADAPTER`, and `SYSTEM` tokens.
   - PEFT `adapter_config.json` contains valid `lora_alpha`, `r`, and `target_modules`.
2. Live route test script `scripts/test-training-routes.js` verifies all HTTP endpoints return HTTP 200 with complete payloads.
3. UI compile check verifies zero Next.js bundling errors.
