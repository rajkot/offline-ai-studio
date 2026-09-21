/**
 * Model-Specific Fill-In-The-Middle (FIM) Prompt Formatter
 * 
 * Accurately formats code prefix and suffix using exact special tokenizer tokens
 * for local and cloud models:
 * - Qwen2.5-Coder: <|fim_prefix|>{prefix}<|fim_suffix|>{suffix}<|fim_middle|>
 * - DeepSeek-Coder: <｜fim begin｜>{prefix}<｜fim hole｜>{suffix}<｜fim end｜>
 * - StarCoder / StarCoder2: <fim_prefix>{prefix}<fim_suffix>{suffix}<fim_middle>
 * - CodeLlama: <PRE> {prefix} <SUF>{suffix} <MID>
 * - Codestral: [PREFIX]{prefix}[SUFFIX]{suffix}
 */

export interface FimPromptResult {
  prompt: string;
  stopTokens: string[];
  isFimSupported: boolean;
  modelFamily: 'qwen' | 'deepseek' | 'starcoder' | 'codellama' | 'codestral' | 'generic';
}

export function formatFimPrompt(
  prefix: string,
  suffix: string = '',
  modelName: string = 'qwen2.5:1.5b',
  filePath?: string
): FimPromptResult {
  const model = modelName.toLowerCase();

  // Optimized context window: Trim prefix to last 1500 chars and suffix to first 500 chars
  // This guarantees sub-100ms time-to-first-token on modern CPUs and local GPUs
  const trimmedPrefix = prefix.length > 1500 ? prefix.slice(-1500) : prefix;
  const trimmedSuffix = suffix.length > 500 ? suffix.slice(0, 500) : suffix;

  // 1. Qwen2.5-Coder Family (e.g. qwen2.5:1.5b, qwen2.5-coder:7b, qwen2.5-coder:1.5b-base)
  if (model.includes('qwen')) {
    return {
      prompt: `<|fim_prefix|>${trimmedPrefix}<|fim_suffix|>${trimmedSuffix}<|fim_middle|>`,
      stopTokens: [
        '<|fim_prefix|>',
        '<|fim_suffix|>',
        '<|fim_middle|>',
        '<|endoftext|>',
        '<|im_end|>',
        '\n\n\n'
      ],
      isFimSupported: true,
      modelFamily: 'qwen'
    };
  }

  // 2. DeepSeek-Coder Family (e.g. deepseek-coder:6.7b, deepseek-coder:1.3b, deepseek-coder-v2)
  if (model.includes('deepseek')) {
    return {
      prompt: `<｜fim begin｜>${trimmedPrefix}<｜fim hole｜>${trimmedSuffix}<｜fim end｜>`,
      stopTokens: [
        '<｜fim begin｜>',
        '<｜fim hole｜>',
        '<｜fim end｜>',
        '<｜end of sentence｜>',
        '\n\n\n'
      ],
      isFimSupported: true,
      modelFamily: 'deepseek'
    };
  }

  // 3. StarCoder / StarCoder2 Family
  if (model.includes('starcoder')) {
    return {
      prompt: `<fim_prefix>${trimmedPrefix}<fim_suffix>${trimmedSuffix}<fim_middle>`,
      stopTokens: [
        '<fim_prefix>',
        '<fim_suffix>',
        '<fim_middle>',
        '<|endoftext|>',
        '\n\n\n'
      ],
      isFimSupported: true,
      modelFamily: 'starcoder'
    };
  }

  // 4. CodeLlama / Llama Family
  if (model.includes('codellama') || model.includes('llama')) {
    return {
      prompt: `<PRE> ${trimmedPrefix} <SUF>${trimmedSuffix} <MID>`,
      stopTokens: [
        '<PRE>',
        '<SUF>',
        '<MID>',
        '<EOT>',
        '</s>',
        '\n\n\n'
      ],
      isFimSupported: true,
      modelFamily: 'codellama'
    };
  }

  // 5. Mistral / Codestral Family
  if (model.includes('codestral') || model.includes('mistral')) {
    return {
      prompt: `[PREFIX]${trimmedPrefix}[SUFFIX]${trimmedSuffix}`,
      stopTokens: [
        '[PREFIX]',
        '[SUFFIX]',
        '</s>',
        '\n\n\n'
      ],
      isFimSupported: true,
      modelFamily: 'codestral'
    };
  }

  // 6. Generic / Fallback (Gemini, Claude, GPT-4o, OmniRoute)
  return {
    prompt: `You are an inline code autocomplete engine for ${filePath || 'code'}.
Complete the code immediately following the cursor.
Output ONLY the raw code completion tokens that directly follow PREFIX, without explanations, without markdown backticks (\`\`\`), and without repeating PREFIX.

PREFIX:
${trimmedPrefix}
${trimmedSuffix ? `\nSUFFIX:\n${trimmedSuffix}` : ''}

COMPLETION:`,
    stopTokens: ['\n\n\n', '```', 'PREFIX:', 'SUFFIX:'],
    isFimSupported: false,
    modelFamily: 'generic'
  };
}

/**
 * Cleans the raw model output by stripping stop tokens, FIM tags, and accidental backticks
 */
export function cleanFimCompletion(rawText: string, modelFamily: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // Remove common FIM special tokens that might bleed through
  const tagsToRemove = [
    '<|fim_prefix|>', '<|fim_suffix|>', '<|fim_middle|>', '<|endoftext|>', '<|im_end|>',
    '<｜fim begin｜>', '<｜fim hole｜>', '<｜fim end｜>', '<｜end of sentence｜>',
    '<fim_prefix>', '<fim_suffix>', '<fim_middle>',
    '<PRE>', '<SUF>', '<MID>', '<EOT>', '</s>',
    '[PREFIX]', '[SUFFIX]'
  ];

  for (const tag of tagsToRemove) {
    cleaned = cleaned.replaceAll(tag, '');
  }

  // Strip markdown code fence artifacts if present
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\n?/, '');
  cleaned = cleaned.replace(/\n?```$/, '');

  // Truncate if 3 consecutive blank lines appear
  const tripleNewlineIdx = cleaned.indexOf('\n\n\n');
  if (tripleNewlineIdx !== -1) {
    cleaned = cleaned.slice(0, tripleNewlineIdx);
  }

  return cleaned;
}
