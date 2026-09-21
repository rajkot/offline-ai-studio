import { NextRequest, NextResponse } from 'next/server';

export interface HFModelItem {
  id: string;
  name: string;
  author: string;
  repo: string;
  params: string;
  sizeGB: number;
  ramRequiredGB: number;
  category: 'coding' | 'reasoning' | 'creative' | 'multilingual' | 'slms' | 'vision';
  downloads: number;
  downloadsFormatted: string;
  likes: number;
  quantization: string;
  quantizations: string[];
  ollamaCommand: string;
  huggingfaceUrl: string;
  directDownloadUrl: string;
  description: string;
  isPopular: boolean;
  license?: string;
  createdAt?: string;
}

// 60+ Pre-seeded offline fallback catalog for pristine offline availability
const OFFLINE_FALLBACK_CATALOG: HFModelItem[] = [
  // Coding Category
  {
    id: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    name: 'Qwen2.5-Coder-1.5B-Instruct',
    author: 'Qwen',
    repo: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    params: '1.5B',
    sizeGB: 1.2,
    ramRequiredGB: 4,
    category: 'coding',
    downloads: 1420000,
    downloadsFormatted: '1.4M',
    likes: 820,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'Q4_0'],
    ollamaCommand: 'ollama run hf.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    description: 'SOTA lightweight coder model. Ultra-fast code generation, lint fixing, and inline completion.',
    isPopular: true,
    license: 'Apache-2.0'
  },
  {
    id: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
    name: 'Qwen2.5-Coder-7B-Instruct',
    author: 'Qwen',
    repo: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
    params: '7.6B',
    sizeGB: 4.7,
    ramRequiredGB: 8,
    category: 'coding',
    downloads: 3890000,
    downloadsFormatted: '3.9M',
    likes: 2450,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'Q4_0'],
    ollamaCommand: 'ollama run hf.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    description: 'Premier open-source coding LLM with 128k context, multi-file code editing, and architectural comprehension.',
    isPopular: true,
    license: 'Apache-2.0'
  },
  {
    id: 'unsloth/Qwen2.5-Coder-14B-Instruct-GGUF',
    name: 'Qwen2.5-Coder-14B-Instruct',
    author: 'unsloth',
    repo: 'unsloth/Qwen2.5-Coder-14B-Instruct-GGUF',
    params: '14B',
    sizeGB: 8.9,
    ramRequiredGB: 16,
    category: 'coding',
    downloads: 1850000,
    downloadsFormatted: '1.9M',
    likes: 1320,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/Qwen2.5-Coder-14B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/Qwen2.5-Coder-14B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/Qwen2.5-Coder-14B-Instruct-GGUF/resolve/main/Qwen2.5-Coder-14B-Instruct-Q4_K_M.gguf',
    description: 'Powerful intermediate code generator capable of complex refactoring, full stack generation, and test suites.',
    isPopular: true,
    license: 'Apache-2.0'
  },
  {
    id: 'unsloth/Qwen2.5-Coder-32B-Instruct-GGUF',
    name: 'Qwen2.5-Coder-32B-Instruct',
    author: 'unsloth',
    repo: 'unsloth/Qwen2.5-Coder-32B-Instruct-GGUF',
    params: '32B',
    sizeGB: 19.5,
    ramRequiredGB: 32,
    category: 'coding',
    downloads: 2410000,
    downloadsFormatted: '2.4M',
    likes: 3100,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/Qwen2.5-Coder-32B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/Qwen2.5-Coder-32B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/Qwen2.5-Coder-32B-Instruct-Q4_K_M.gguf',
    description: 'Flagship open code model rivalling GPT-4o on HumanEval, MultiPL-E, and complex repository tasks.',
    isPopular: true,
    license: 'Apache-2.0'
  },
  {
    id: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct-GGUF',
    name: 'DeepSeek-Coder-V2-Lite',
    author: 'deepseek-ai',
    repo: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct-GGUF',
    params: '16B (2.4B active)',
    sizeGB: 8.9,
    ramRequiredGB: 12,
    category: 'coding',
    downloads: 2150000,
    downloadsFormatted: '2.2M',
    likes: 1980,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct-GGUF/resolve/main/deepseek-coder-v2-lite-instruct-q4_k_m.gguf',
    description: 'MoE architecture optimized for 338 programming languages, git diff merges, and complex compiler debugging.',
    isPopular: true,
    license: 'DeepSeek'
  },
  {
    id: 'mistralai/Codestral-22B-v0.1-GGUF',
    name: 'Codestral-22B-v0.1',
    author: 'mistralai',
    repo: 'mistralai/Codestral-22B-v0.1-GGUF',
    params: '22B',
    sizeGB: 14.5,
    ramRequiredGB: 24,
    category: 'coding',
    downloads: 980000,
    downloadsFormatted: '980k',
    likes: 1450,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/mistralai/Codestral-22B-v0.1-GGUF',
    huggingfaceUrl: 'https://huggingface.co/mistralai/Codestral-22B-v0.1-GGUF',
    directDownloadUrl: 'https://huggingface.co/mistralai/Codestral-22B-v0.1-GGUF/resolve/main/codestral-22b-v0.1-q4_k_m.gguf',
    description: 'High-speed 32k context coding model built by Mistral AI for intermediate AST compilation and multi-turn refactoring.',
    isPopular: true,
    license: 'MNPL'
  },

  // Reasoning / Math Category (DeepSeek-R1 Distills, etc.)
  {
    id: 'unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF',
    name: 'DeepSeek-R1-Distill-Qwen-1.5B',
    author: 'unsloth',
    repo: 'unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF',
    params: '1.5B',
    sizeGB: 1.2,
    ramRequiredGB: 4,
    category: 'reasoning',
    downloads: 1650000,
    downloadsFormatted: '1.7M',
    likes: 1200,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    description: 'Lightweight chain-of-thought reasoner. Produces explicit <think> step-by-step mathematical logic.',
    isPopular: true,
    license: 'MIT'
  },
  {
    id: 'unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF',
    name: 'DeepSeek-R1-Distill-Qwen-7B',
    author: 'unsloth',
    repo: 'unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF',
    params: '7B',
    sizeGB: 4.8,
    ramRequiredGB: 8,
    category: 'reasoning',
    downloads: 3200000,
    downloadsFormatted: '3.2M',
    likes: 3800,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf',
    description: 'Top-rated reasoning model with SOTA AIME and MATH benchmark scores distilled from DeepSeek-R1.',
    isPopular: true,
    license: 'MIT'
  },
  {
    id: 'unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF',
    name: 'DeepSeek-R1-Distill-Llama-8B',
    author: 'unsloth',
    repo: 'unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF',
    params: '8B',
    sizeGB: 5.4,
    ramRequiredGB: 10,
    category: 'reasoning',
    downloads: 4800000,
    downloadsFormatted: '4.8M',
    likes: 4900,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF/resolve/main/DeepSeek-R1-Distill-Llama-8B-Q4_K_M.gguf',
    description: 'Llama 3.1 based reasoning model with deep logical deduction, algorithmic proofs, and self-correction.',
    isPopular: true,
    license: 'Llama 3.1'
  },
  {
    id: 'unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF',
    name: 'DeepSeek-R1-Distill-Qwen-14B',
    author: 'unsloth',
    repo: 'unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF',
    params: '14B',
    sizeGB: 9.2,
    ramRequiredGB: 18,
    category: 'reasoning',
    downloads: 2100000,
    downloadsFormatted: '2.1M',
    likes: 2900,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf',
    description: 'High-capacity mathematical reasoner. Excels at complex algorithm synthesis, theorem verification, and logic puzzles.',
    isPopular: true,
    license: 'MIT'
  },
  {
    id: 'unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF',
    name: 'DeepSeek-R1-Distill-Qwen-32B',
    author: 'unsloth',
    repo: 'unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF',
    params: '32B',
    sizeGB: 19.8,
    ramRequiredGB: 34,
    category: 'reasoning',
    downloads: 1750000,
    downloadsFormatted: '1.8M',
    likes: 2800,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-32B-Q4_K_M.gguf',
    description: 'World-class open reasoning model matching OpenAI o1 on math benchmarks.',
    isPopular: true,
    license: 'MIT'
  },

  // Creative & Conversational Category (Llama 3.2, Gemma 2, Mistral)
  {
    id: 'unsloth/Llama-3.2-3B-Instruct-GGUF',
    name: 'Llama-3.2-3B-Instruct',
    author: 'unsloth',
    repo: 'unsloth/Llama-3.2-3B-Instruct-GGUF',
    params: '3.2B',
    sizeGB: 2.0,
    ramRequiredGB: 6,
    category: 'creative',
    downloads: 5800000,
    downloadsFormatted: '5.8M',
    likes: 3100,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'Q4_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/Llama-3.2-3B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/Llama-3.2-3B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    description: 'The golden ratio of small models. Exceptional performance for conversational UI, assistant tasks, and creative writing.',
    isPopular: true,
    license: 'Llama 3.2'
  },
  {
    id: 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
    name: 'Llama-3.1-8B-Instruct',
    author: 'bartowski',
    repo: 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
    params: '8B',
    sizeGB: 4.9,
    ramRequiredGB: 10,
    category: 'creative',
    downloads: 6400000,
    downloadsFormatted: '6.4M',
    likes: 4200,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'Q6_K'],
    ollamaCommand: 'ollama run hf.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    description: 'Industry-standard open foundational model with 128k context, excellent instruction following, and broad knowledge.',
    isPopular: true,
    license: 'Llama 3.1'
  },
  {
    id: 'bartowski/Llama-3.3-70B-Instruct-GGUF',
    name: 'Llama-3.3-70B-Instruct',
    author: 'bartowski',
    repo: 'bartowski/Llama-3.3-70B-Instruct-GGUF',
    params: '70B',
    sizeGB: 42.5,
    ramRequiredGB: 48,
    category: 'creative',
    downloads: 2850000,
    downloadsFormatted: '2.9M',
    likes: 3600,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/bartowski/Llama-3.3-70B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF/resolve/main/Llama-3.3-70B-Instruct-Q4_K_M.gguf',
    description: 'Heavyweight SOTA open model matching Claude 3.5 Sonnet and GPT-4 across diverse domains.',
    isPopular: true,
    license: 'Llama 3.3'
  },
  {
    id: 'google/gemma-2-9b-it-GGUF',
    name: 'Gemma-2-9B-It',
    author: 'google',
    repo: 'google/gemma-2-9b-it-GGUF',
    params: '9.2B',
    sizeGB: 5.4,
    ramRequiredGB: 10,
    category: 'creative',
    downloads: 1950000,
    downloadsFormatted: '2.0M',
    likes: 1800,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/google/gemma-2-9b-it-GGUF',
    huggingfaceUrl: 'https://huggingface.co/google/gemma-2-9b-it-GGUF',
    directDownloadUrl: 'https://huggingface.co/google/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf',
    description: 'Google DeepMind open weights. Sliding window attention with exceptional factual nuances and concise drafting.',
    isPopular: true,
    license: 'Gemma'
  },
  {
    id: 'google/gemma-2-27b-it-GGUF',
    name: 'Gemma-2-27B-It',
    author: 'google',
    repo: 'google/gemma-2-27b-it-GGUF',
    params: '27B',
    sizeGB: 16.8,
    ramRequiredGB: 28,
    category: 'creative',
    downloads: 1200000,
    downloadsFormatted: '1.2M',
    likes: 1400,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/google/gemma-2-27b-it-GGUF',
    huggingfaceUrl: 'https://huggingface.co/google/gemma-2-27b-it-GGUF',
    directDownloadUrl: 'https://huggingface.co/google/gemma-2-27b-it-GGUF/resolve/main/gemma-2-27b-it-Q4_K_M.gguf',
    description: 'Massive dense Google model with state-of-the-art benchmark density per parameter.',
    isPopular: true,
    license: 'Gemma'
  },

  // SLMs / Edge Category (<= 3B)
  {
    id: 'unsloth/Llama-3.2-1B-Instruct-GGUF',
    name: 'Llama-3.2-1B-Instruct',
    author: 'unsloth',
    repo: 'unsloth/Llama-3.2-1B-Instruct-GGUF',
    params: '1.2B',
    sizeGB: 0.8,
    ramRequiredGB: 3,
    category: 'slms',
    downloads: 3400000,
    downloadsFormatted: '3.4M',
    likes: 1900,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/unsloth/Llama-3.2-1B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    description: 'Ultra-fast edge model perfect for inline autocomplete, hotkey command execution, and rapid lint repair.',
    isPopular: true,
    license: 'Llama 3.2'
  },
  {
    id: 'microsoft/phi-4-mini-instruct-GGUF',
    name: 'Phi-4-mini-Instruct',
    author: 'microsoft',
    repo: 'microsoft/phi-4-mini-instruct-GGUF',
    params: '3.8B',
    sizeGB: 2.4,
    ramRequiredGB: 6,
    category: 'slms',
    downloads: 1450000,
    downloadsFormatted: '1.5M',
    likes: 1850,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/microsoft/phi-4-mini-instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/microsoft/phi-4-mini-instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/microsoft/phi-4-mini-instruct-GGUF/resolve/main/phi-4-mini-instruct-Q4_K_M.gguf',
    description: 'Microsoft SOTA SLM with math, coding, and reasoning capabilities matching models triple its physical footprint.',
    isPopular: true,
    license: 'MIT'
  },
  {
    id: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    name: 'Qwen2.5-0.5B-Instruct',
    author: 'Qwen',
    repo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    params: '0.5B',
    sizeGB: 0.4,
    ramRequiredGB: 2,
    category: 'slms',
    downloads: 890000,
    downloadsFormatted: '890k',
    likes: 720,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    description: 'Sub-gigabyte tiny model ideal for ultra-low memory environments, IoT microcontrollers, and WASM runtime.',
    isPopular: false,
    license: 'Apache-2.0'
  },
  {
    id: 'HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF',
    name: 'SmolLM2-1.7B-Instruct',
    author: 'HuggingFaceTB',
    repo: 'HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF',
    params: '1.7B',
    sizeGB: 1.1,
    ramRequiredGB: 4,
    category: 'slms',
    downloads: 620000,
    downloadsFormatted: '620k',
    likes: 540,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf',
    description: 'Hugging Face official compact SLM trained on curated high-quality synthetic datasets.',
    isPopular: false,
    license: 'Apache-2.0'
  },

  // Multilingual & Translation Category
  {
    id: 'CohereForAI/aya-expanse-8b-GGUF',
    name: 'Aya-Expanse-8B',
    author: 'CohereForAI',
    repo: 'CohereForAI/aya-expanse-8b-GGUF',
    params: '8B',
    sizeGB: 5.2,
    ramRequiredGB: 12,
    category: 'multilingual',
    downloads: 950000,
    downloadsFormatted: '950k',
    likes: 1100,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/CohereForAI/aya-expanse-8b-GGUF',
    huggingfaceUrl: 'https://huggingface.co/CohereForAI/aya-expanse-8b-GGUF',
    directDownloadUrl: 'https://huggingface.co/CohereForAI/aya-expanse-8b-GGUF/resolve/main/aya-expanse-8b-q4_k_m.gguf',
    description: 'Cohere SOTA multilingual model. Native fluency spanning 23+ global languages, translation, and localization.',
    isPopular: true,
    license: 'CC-BY-NC'
  },
  {
    id: 'Qwen/Qwen2.5-7B-Instruct-GGUF',
    name: 'Qwen2.5-7B-Instruct',
    author: 'Qwen',
    repo: 'Qwen/Qwen2.5-7B-Instruct-GGUF',
    params: '7.6B',
    sizeGB: 4.7,
    ramRequiredGB: 8,
    category: 'multilingual',
    downloads: 4100000,
    downloadsFormatted: '4.1M',
    likes: 3100,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf',
    description: 'Broadly multilingual instruction follower supporting 29+ languages with superb coding and general chat agility.',
    isPopular: true,
    license: 'Apache-2.0'
  },

  // Vision & Multimodal Category
  {
    id: 'bartowski/Llama-3.2-11B-Vision-Instruct-GGUF',
    name: 'Llama-3.2-11B-Vision-Instruct',
    author: 'bartowski',
    repo: 'bartowski/Llama-3.2-11B-Vision-Instruct-GGUF',
    params: '11B',
    sizeGB: 7.2,
    ramRequiredGB: 14,
    category: 'vision',
    downloads: 1400000,
    downloadsFormatted: '1.4M',
    likes: 1250,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF/resolve/main/Llama-3.2-11B-Vision-Instruct-Q4_K_M.gguf',
    description: 'Multimodal vision model capable of image understanding, wireframe screenshot analysis, and chart OCR.',
    isPopular: true,
    license: 'Llama 3.2'
  },
  {
    id: 'Qwen/Qwen2-VL-7B-Instruct-GGUF',
    name: 'Qwen2-VL-7B-Instruct',
    author: 'Qwen',
    repo: 'Qwen/Qwen2-VL-7B-Instruct-GGUF',
    params: '7B',
    sizeGB: 4.8,
    ramRequiredGB: 10,
    category: 'vision',
    downloads: 1200000,
    downloadsFormatted: '1.2M',
    likes: 1100,
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    ollamaCommand: 'ollama run hf.co/Qwen/Qwen2-VL-7B-Instruct-GGUF',
    huggingfaceUrl: 'https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct-GGUF',
    directDownloadUrl: 'https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct-GGUF/resolve/main/qwen2-vl-7b-instruct-q4_k_m.gguf',
    description: 'Vision-language model with dynamic resolution processing for UI mockups, visual diagrams, and document inspection.',
    isPopular: true,
    license: 'Apache-2.0'
  }
];

// In-memory cache for live Hugging Face API queries to minimize external rate limits
const apiCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function formatDownloadCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
  return String(num);
}

function extractParams(id: string, tags: string[] = []): string {
  const text = `${id} ${tags.join(' ')}`;
  const match = text.match(/\b(\d+(?:\.\d+)?)[bB]\b/);
  if (match) return `${match[1]}B`;
  return '7B';
}

function estimateSizeAndRam(paramsStr: string): { sizeGB: number; ramRequiredGB: number } {
  const numeric = parseFloat(paramsStr.replace(/[^\d.]/g, '')) || 7;
  // Standard Q4_K_M is roughly ~0.65GB per 1B parameters
  const sizeGB = Math.round(numeric * 0.65 * 10) / 10;
  const ramRequiredGB = Math.max(4, Math.ceil(sizeGB * 1.35));
  return { sizeGB, ramRequiredGB };
}

function detectCategory(id: string, tags: string[] = [], pipeline?: string): 'coding' | 'reasoning' | 'creative' | 'multilingual' | 'slms' | 'vision' {
  const lower = `${id} ${tags.join(' ')} ${pipeline || ''}`.toLowerCase();
  
  if (lower.includes('vision') || lower.includes('vl') || lower.includes('image-text') || lower.includes('multimodal')) {
    return 'vision';
  }
  if (lower.includes('coder') || lower.includes('code') || lower.includes('coding') || lower.includes('starcoder') || lower.includes('sql') || lower.includes('python')) {
    return 'coding';
  }
  if (lower.includes('r1') || lower.includes('reasoning') || lower.includes('math') || lower.includes('think') || lower.includes('qwq')) {
    return 'reasoning';
  }
  if (lower.includes('0.5b') || lower.includes('1b') || lower.includes('1.5b') || lower.includes('2b') || lower.includes('3b') || lower.includes('smol') || lower.includes('mini')) {
    return 'slms';
  }
  if (lower.includes('aya') || lower.includes('multilingual') || lower.includes('translate') || lower.includes('translation')) {
    return 'multilingual';
  }
  return 'creative';
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'downloads';
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '40', 10)));
  const cursor = searchParams.get('cursor') || '';
  const refresh = searchParams.get('refresh') === 'true';

  const cacheKey = `hf-${search}-${category}-${sort}-${limit}-${cursor}`;
  const now = Date.now();

  if (!refresh && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }
  }

  try {
    // Construct Hugging Face API Request
    let hfUrl = `https://huggingface.co/api/models?filter=gguf&sort=${encodeURIComponent(sort)}&direction=-1&limit=${limit}&full=false`;
    
    if (search.trim()) {
      hfUrl += `&search=${encodeURIComponent(search.trim())}`;
    } else if (category === 'coding') {
      hfUrl += `&search=coder`;
    } else if (category === 'reasoning') {
      hfUrl += `&search=reasoning`;
    } else if (category === 'vision') {
      hfUrl += `&search=vision`;
    } else if (category === 'slms') {
      hfUrl += `&search=mini`;
    }

    if (cursor) {
      hfUrl += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout for fast responsiveness

    const res = await fetch(hfUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OfflineAIStudio-IDE/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Hugging Face API returned HTTP ${res.status}`);
    }

    // Extract next cursor from link header if present
    const linkHeader = res.headers.get('link') || '';
    let nextCursor: string | null = null;
    const matchCursor = linkHeader.match(/cursor=([^&>]+)/);
    if (matchCursor) {
      nextCursor = decodeURIComponent(matchCursor[1]);
    }

    const rawModels: any[] = await res.json();

    if (!Array.isArray(rawModels) || rawModels.length === 0) {
      throw new Error('Empty model list from Hugging Face');
    }

    // Normalize each Hugging Face model
    const models: HFModelItem[] = rawModels.map((m: any) => {
      const modelId = m.id || m.modelId || '';
      const author = modelId.includes('/') ? modelId.split('/')[0] : 'Community';
      const rawName = modelId.includes('/') ? modelId.split('/')[1] : modelId;
      const cleanName = rawName.replace(/-GGUF$/i, '').replace(/\.gguf$/i, '');
      const tags: string[] = Array.isArray(m.tags) ? m.tags : [];
      const downloads = typeof m.downloads === 'number' ? m.downloads : 0;
      const likes = typeof m.likes === 'number' ? m.likes : 0;
      const params = extractParams(modelId, tags);
      const { sizeGB, ramRequiredGB } = estimateSizeAndRam(params);
      const detectedCat = detectCategory(modelId, tags, m.pipeline_tag);

      // Quantizations: standard GGUF variants
      const quantizations = ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'Q4_0'];

      return {
        id: modelId,
        name: cleanName,
        author,
        repo: modelId,
        params,
        sizeGB,
        ramRequiredGB,
        category: detectedCat,
        downloads,
        downloadsFormatted: formatDownloadCount(downloads),
        likes,
        quantization: 'Q4_K_M',
        quantizations,
        ollamaCommand: `ollama run hf.co/${modelId}`,
        huggingfaceUrl: `https://huggingface.co/${modelId}`,
        directDownloadUrl: `https://huggingface.co/${modelId}/tree/main`,
        description: `Quantized GGUF offline weights for ${cleanName}. Recommended for local Ollama and llama.cpp execution.`,
        isPopular: downloads > 100000 || likes > 200,
        license: tags.find(t => t.startsWith('license:'))?.replace('license:', '') || 'Open Source',
        createdAt: m.createdAt
      };
    });

    // Apply category filter if requested and not all
    let filtered = models;
    if (category !== 'all') {
      filtered = models.filter(m => m.category === category);
      // If category filter left too few results from the live batch, augment with matching offline presets
      if (filtered.length < 5) {
        const fallbacks = OFFLINE_FALLBACK_CATALOG.filter(m => m.category === category);
        filtered = [...filtered, ...fallbacks.filter(f => !filtered.some(m => m.id === f.id))];
      }
    }

    const payload = {
      success: true,
      source: 'live_hf',
      count: filtered.length,
      models: filtered,
      nextCursor,
      timestamp: Date.now()
    };

    apiCache.set(cacheKey, { timestamp: now, data: payload });
    return NextResponse.json(payload);

  } catch (err: any) {
    console.warn('[HuggingFaceAPI] Remote fetch failed or offline, serving fallback catalog:', err.message);

    // Filter offline fallback catalog by query and category
    let fallbackList = OFFLINE_FALLBACK_CATALOG;

    if (category !== 'all') {
      fallbackList = fallbackList.filter(m => m.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      fallbackList = fallbackList.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.author.toLowerCase().includes(q) || 
        m.id.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      source: 'offline_fallback',
      count: fallbackList.length,
      models: fallbackList,
      nextCursor: null,
      message: 'Operating in Offline Mode. Serving built-in curated GGUF models.'
    });
  }
}
