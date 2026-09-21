// app/api/search/semantic/route.ts
// Natural Language Semantic Codebase Search — local vector embeddings + BM25 fusion

import { NextRequest, NextResponse } from 'next/server';
import { checkOllamaHealth, generateOllamaText, listOllamaModels, selectBestOllamaModel } from '@/lib/ai/ollamaClient';
import { GoogleGenAI } from '@google/genai';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface SearchFile {
  path: string;
  content: string;
}

interface SearchResult {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
  score: number;
  matchType: 'semantic' | 'bm25' | 'hybrid';
  matchedTerms: string[];
  explanation?: string;
}

/* ─── Tokenizer helpers ──────────────────────────────────────────────────── */

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
}

const STOP_WORDS = new Set([
  'the','a','an','in','on','at','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may',
  'of','to','for','and','or','but','if','not','with','by','from','that','this',
  'it','its','as','so','return','function','class','const','let','var','import',
  'export','async','await','new','null','undefined','true','false','type','interface',
]);

function queryTokens(q: string): string[] {
  return tokenize(q).filter(t => !STOP_WORDS.has(t) && t.length > 2);
}

/* ─── Deterministic 128-dim embedding from text ─────────────────────────── */

function textToVector(text: string): number[] {
  const tokens = tokenize(text);
  const vec = new Array(128).fill(0);
  
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    for (let j = 0; j < t.length; j++) {
      const dim = (t.charCodeAt(j) * 31 + j * 7 + i * 3) % 128;
      vec[dim] += 1 / (1 + Math.log(i + 1));
    }
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/* ─── Smart code chunking ────────────────────────────────────────────────── */

interface CodeChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

function chunkCode(file: SearchFile): CodeChunk[] {
  const lines = file.content.split('\n');
  const chunks: CodeChunk[] = [];
  const CHUNK_SIZE = 25;

  const boundaries = [
    /^\s*(export\s+)?(async\s+)?function\s+\w+/,
    /^\s*(export\s+)?(default\s+)?class\s+\w+/,
    /^\s*(export\s+)?(const|let)\s+\w+\s*=\s*(async\s*)?\(/,
    /^\s*\/\/ ─/,
    /^\s*\/\*\*/,
    /^\s*export\s+default/,
    /^\s*(export\s+)?interface\s+\w+/,
    /^\s*(export\s+)?type\s+\w+/,
  ];

  let i = 0;
  while (i < lines.length) {
    const start = i;
    let end = Math.min(i + CHUNK_SIZE - 1, lines.length - 1);

    // Extend to next natural boundary
    for (let k = end + 1; k < Math.min(end + CHUNK_SIZE, lines.length); k++) {
      if (boundaries.some(p => p.test(lines[k]))) { end = k - 1; break; }
    }

    const content = lines.slice(start, end + 1).join('\n').trim();
    if (content) {
      chunks.push({ filePath: file.path, startLine: start + 1, endLine: end + 1, content });
    }
    i = end + 1;
  }
  return chunks;
}

/* ─── BM25 scoring ──────────────────────────────────────────────────────── */

function bm25(chunk: CodeChunk, terms: string[], avgLen: number): { score: number; matched: string[] } {
  const docTokens = tokenize(chunk.content);
  const tf: Record<string, number> = {};
  docTokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const k1 = 1.5, b = 0.75;
  let score = 0;
  const matched: string[] = [];

  for (const term of terms) {
    const freq = tf[term] || 0;
    if (freq > 0) {
      matched.push(term);
      const idf = Math.log(2 / (freq + 0.5) + 1);
      const tfNorm = (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * docTokens.length / avgLen));
      score += idf * tfNorm;
    }
  }

  // File path token boost
  const pathTerms = tokenize(chunk.filePath);
  for (const term of terms) { if (pathTerms.includes(term)) score *= 1.4; }

  return { score, matched };
}

/* ─── Hybrid search ──────────────────────────────────────────────────────── */

function hybridSearch(files: SearchFile[], query: string, topK: number): SearchResult[] {
  const terms = queryTokens(query);
  const queryVec = textToVector(query);
  const allChunks = files.flatMap(f => chunkCode(f));
  const avgLen = allChunks.reduce((s, c) => s + tokenize(c.content).length, 0) / (allChunks.length || 1);

  const scored = allChunks.map(chunk => {
    const chunkVec = textToVector(chunk.content);
    const semScore = cosineSim(queryVec, chunkVec);
    const { score: bm25Score, matched } = bm25(chunk, terms, avgLen);

    // RRF-inspired fusion
    const hybrid = 0.6 * semScore + 0.4 * (bm25Score / 10);
    return { chunk, semScore, bm25Score, hybrid, matched };
  });

  // Sort by hybrid score
  scored.sort((a, b) => b.hybrid - a.hybrid);

  // Deduplicate by file (max 3 per file for diversity)
  const fileCounts = new Map<string, number>();
  const results: SearchResult[] = [];

  for (const s of scored) {
    if (results.length >= topK) break;
    const count = fileCounts.get(s.chunk.filePath) ?? 0;
    if (count >= 3) continue;
    fileCounts.set(s.chunk.filePath, count + 1);

    results.push({
      filePath: s.chunk.filePath,
      startLine: s.chunk.startLine,
      endLine: s.chunk.endLine,
      snippet: s.chunk.content.slice(0, 500),
      score: Math.round(s.hybrid * 1000) / 1000,
      matchType: s.matched.length > 0 ? 'hybrid' : 'semantic',
      matchedTerms: s.matched,
    });
  }

  return results;
}

/* ─── AI explanation (optional) ─────────────────────────────────────────── */

async function getAiExplanation(query: string, results: SearchResult[]): Promise<string> {
  const context = results.slice(0, 5).map(r =>
    `${r.filePath} (lines ${r.startLine}-${r.endLine}):\n${r.snippet}`
  ).join('\n\n---\n\n');

  const prompt = `You are a code search assistant. The user searched for: "${query}"

The top code results are:
${context}

In 2-3 sentences, explain what these code snippets do in the context of the user's query. Be precise and reference file names.`;

  // Try Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ text: prompt }],
        config: { maxOutputTokens: 256, temperature: 0.1 },
      });
      return response.text || '';
    } catch {}
  }

  // Try Ollama
  try {
    const health = await checkOllamaHealth();
    if (health.online) {
      const models = await listOllamaModels();
      const model = selectBestOllamaModel(models);
      const resp = await generateOllamaText({ model, prompt, temperature: 0.1 });
      return resp.slice(0, 300);
    }
  } catch {}

  return '';
}

/* ─── Main route ─────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, files = [], topK = 20, explain = false } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ results: [], query, totalFiles: 0, message: 'No files indexed' });
    }

    const startMs = Date.now();
    const results = hybridSearch(files as SearchFile[], query, topK);
    const queryMs = Date.now() - startMs;

    let explanation = '';
    if (explain && results.length > 0) {
      explanation = await getAiExplanation(query, results);
    }

    return NextResponse.json({
      success: true,
      query,
      results,
      explanation,
      totalFiles: files.length,
      totalChunks: (files as SearchFile[]).flatMap(f => chunkCode(f)).length,
      queryMs,
    });

  } catch (err: any) {
    console.error('[semantic-search] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
