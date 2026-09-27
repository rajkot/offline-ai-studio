# Multimodal Autonomous AI Builder & Voice-to-Code Pipeline Specification

## 1. Overview
Offline AI Studio IDE requires an autonomous **Voice-Driven Multimodal AI Builder** subsystem combining local speech audio transcription, natural intent parsing, and image wireframe-to-code synthesis.

This subsystem provides:
1. **Local Speech & Voice Intent Extraction**:
   - Parses spoken audio and natural speech transcripts into structured agent actions: `refactor`, `generate`, `fix`, `test`, `audit`.
   - Resolves target files, component names, and architectural constraints.
2. **Autonomous Voice-to-Code Synthesis**:
   - Translates spoken directives (e.g. *"Create a responsive user profile card with dark mode and edit profile buttons"*) directly into production-grade React components with TypeScript strict types.
3. **Multimodal Vision-to-Code Pipeline**:
   - Ingests UI screenshots, wireframes, or mockup SVGs and converts them into production-ready React components with Lucide icons and Tailwind styles.
4. **Interactive UI Upgrades**:
   - `client/components/VoiceToCodeOverlay.tsx`: Upgraded with **"⚡ Build with Autonomous Agent"** button that dispatches spoken commands to the multimodal engine and applies the code to the active editor.
   - `client/components/VisionStudio.tsx`: Integrated with 1-click **"Apply to Project"** and **"Test in Sandbox"** actions.

---

## 2. Data Structures & Types

### 2.1 Voice Command & Intent
```typescript
export interface VoiceCommandIntent {
  rawTranscript: string;
  action: 'refactor' | 'generate' | 'fix' | 'test' | 'audit' | 'dictate';
  targetComponent?: string;
  targetFile?: string;
  requirements: string[];
  cleanPrompt: string;
}

export interface VoiceBuildResult {
  success: boolean;
  intent: VoiceCommandIntent;
  synthesizedCode: string;
  suggestedFilePath: string;
  executionTimeMs: number;
  tokensUsed: number;
  summary: string;
}
```

### 2.2 Multimodal Vision-to-Code Request & Result
```typescript
export interface VisionToCodeRequest {
  imagePayload?: string; // base64 or SVG
  layoutType?: 'dashboard' | 'auth' | 'ecommerce' | 'settings' | 'custom';
  framework?: 'react_tailwind' | 'react_css' | 'html_css';
  componentName?: string;
  promptDirective?: string;
}

export interface VisionToCodeResult {
  success: boolean;
  componentName: string;
  synthesizedCode: string;
  previewSvg?: string;
  elementsDetected: string[];
  tokensUsed: number;
  executionTimeMs: number;
}
```

---

## 3. Architecture & API Endpoints

### 3.1 `lib/ai/multimodalVoiceAgentEngine.ts`
- **`parseVoiceIntent(transcript: string, activeFile?: string): VoiceCommandIntent`**:
  Extracts action, target component, and technical directives from spoken English transcripts.
- **`executeVoiceCommand(transcript: string, activeFile?: string, existingCode?: string): Promise<VoiceBuildResult>`**:
  Runs local model or deterministic template synthesizer to generate production code matching the voice intent.
- **`synthesizeFromVision(request: VisionToCodeRequest): Promise<VisionToCodeResult>`**:
  Translates visual layout directives or wireframe images into styled, responsive React components.

### 3.2 API Endpoints
- `POST /api/multimodal/voice-command`: Processes voice commands and returns synthesized code.
- `POST /api/multimodal/vision-to-code`: Generates components from image wireframes and mockups.
- `GET /api/multimodal/status`: Returns multimodal engine telemetry, active models, and supported intents.

### 3.3 UI Integration
- Upgrades `client/components/VoiceToCodeOverlay.tsx` with autonomous build mode.
- Connects `client/components/VisionStudio.tsx` to `/api/multimodal/vision-to-code`.

---

## 4. Testing & Verification Criteria
1. `scripts/test-multimodal-engine.js`:
   - Asserts intent parsing accurately identifies `refactor`, `generate`, `fix`, and `test` from varied natural language commands.
   - Asserts voice-to-code execution produces complete, non-empty, syntactically valid TypeScript React components.
   - Asserts vision-to-code synthesis generates responsive components with icons and clean props.
2. `scripts/test-multimodal-routes.js`:
   - Verifies all HTTP endpoints return HTTP 200 with complete payloads.
3. UI compile check verifies 0 errors on Next.js dev server.
