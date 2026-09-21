// app/api/composer/rag-generate/route.ts
// RAG-enhanced Multi-File Composer: semantic retrieval → context building → multi-file generation

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { checkOllamaHealth, generateOllamaText, listOllamaModels, selectBestOllamaModel } from '@/lib/ai/ollamaClient';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface WorkspaceFile {
  path: string;
  content: string;
  language?: string;
}

interface RagChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
  matchedTerms: string[];
}

interface RagGenerateRequest {
  prompt: string;
  workspaceFiles: WorkspaceFile[];
  model?: string;
  topK?: number;
  maxContextTokens?: number;
  intent?: 'feature' | 'refactor' | 'bugfix' | 'docs' | 'test';
}

/* ─── BM25-lite tokeniser (server-side, no external deps) ───────────────── */

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'of', 'to', 'for',
  'and', 'or', 'but', 'if', 'not', 'with', 'by', 'from', 'that', 'this',
  'which', 'it', 'its', 'as', 'so', 'import', 'export', 'const', 'let',
  'var', 'return', 'function', 'class', 'type', 'interface', 'async',
  'await', 'new', 'null', 'undefined', 'true', 'false', 'string', 'number',
]);

function queryTerms(query: string): string[] {
  return tokenise(query).filter(t => !STOP_WORDS.has(t) && t.length > 2);
}

/* ─── Semantic chunking ─────────────────────────────────────────────────── */

function chunkFile(file: WorkspaceFile, chunkSize = 40): RagChunk[] {
  const lines = file.content.split('\n');
  const chunks: RagChunk[] = [];

  const boundaryPatterns = [
    /^\s*(export\s+)?(async\s+)?function\s+/,
    /^\s*(export\s+)?(default\s+)?class\s+/,
    /^\s*(export\s+)?(const|let|var)\s+\w+\s*=/,
    /^\s*\/\/\s*[─━═]{3,}/,
    /^\s*\/\*\*/,
  ];

  let i = 0;
  while (i < lines.length) {
    const start = i;
    let end = Math.min(i + chunkSize - 1, lines.length - 1);

    for (let k = end + 1; k < Math.min(i + chunkSize * 2, lines.length); k++) {
      if (boundaryPatterns.some(p => p.test(lines[k]))) {
        end = k - 1;
        break;
      }
    }

    const content = lines.slice(start, end + 1).join('\n');
    if (content.trim()) {
      chunks.push({ filePath: file.path, startLine: start + 1, endLine: end + 1, content, score: 0, matchedTerms: [] });
    }
    i = end + 1;
  }

  return chunks;
}

/* ─── BM25 scoring ──────────────────────────────────────────────────────── */

function bm25Score(chunk: RagChunk, terms: string[], avgDocLen: number, k1 = 1.5, b = 0.75): { score: number; matchedTerms: string[] } {
  const docTokens = tokenise(chunk.content);
  const docLen = docTokens.length;
  const tf: Record<string, number> = {};
  for (const t of docTokens) tf[t] = (tf[t] || 0) + 1;

  let score = 0;
  const matched: string[] = [];

  for (const term of terms) {
    const termFreq = tf[term] || 0;
    if (termFreq > 0) {
      matched.push(term);
      const idf = Math.log((1 + 1) / (termFreq + 0.5) + 1);
      const tfNorm = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * docLen / avgDocLen));
      score += idf * tfNorm;
    }
  }

  const pathTokens = tokenise(chunk.filePath);
  for (const term of terms) {
    if (pathTokens.includes(term)) score *= 1.3;
  }

  return { score, matchedTerms: matched };
}

/* ─── RAG retrieval ─────────────────────────────────────────────────────── */

function retrieveContext(workspaceFiles: WorkspaceFile[], query: string, topK = 12): RagChunk[] {
  const terms = queryTerms(query);
  if (terms.length === 0) {
    return workspaceFiles.slice(0, topK).map(f => ({
      filePath: f.path, startLine: 1, endLine: Math.min(30, f.content.split('\n').length),
      content: f.content.split('\n').slice(0, 30).join('\n'), score: 0, matchedTerms: [],
    }));
  }

  const allChunks: RagChunk[] = workspaceFiles.flatMap(f => chunkFile(f));
  const avgDocLen = allChunks.reduce((s, c) => s + tokenise(c.content).length, 0) / (allChunks.length || 1);

  const scored = allChunks.map(chunk => {
    const { score, matchedTerms } = bm25Score(chunk, terms, avgDocLen);
    return { ...chunk, score, matchedTerms };
  });

  const seen = new Map<string, number>();
  const results: RagChunk[] = [];
  const sorted = scored.sort((a, b) => b.score - a.score);

  for (const chunk of sorted) {
    if (results.length >= topK) break;
    const prev = seen.get(chunk.filePath) ?? 0;
    seen.set(chunk.filePath, prev + 1);
    if (prev < 2) results.push(chunk);
  }

  return results;
}

function buildContextWindow(chunks: RagChunk[], maxTokens = 6000): string {
  const parts: string[] = [];
  let estimatedTokens = 0;
  for (const chunk of chunks) {
    const chunkText = `\n### ${chunk.filePath} (lines ${chunk.startLine}-${chunk.endLine})\n\`\`\`\n${chunk.content}\n\`\`\`\n`;
    const tokenEst = chunkText.length / 4;
    if (estimatedTokens + tokenEst > maxTokens) break;
    parts.push(chunkText);
    estimatedTokens += tokenEst;
  }
  return parts.join('');
}

/* ─── Main route ────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body: RagGenerateRequest = await req.json();
    const { prompt, workspaceFiles = [], model: requestedModel, topK = 12, maxContextTokens = 6000, intent = 'feature' } = body;

    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const retrievedChunks = retrieveContext(workspaceFiles, prompt, topK);
    const contextWindow = buildContextWindow(retrievedChunks, maxContextTokens);
    const fileListStr = workspaceFiles.map(f => f.path).join(', ');

    const ragPreamble = `You are a Principal Software Architect and Cascade / Composer Multi-File Agent.
You have access to the following workspace context, retrieved via semantic search:

${contextWindow}

All workspace files: ${fileListStr}

Return ONLY a valid JSON object (no markdown fences):
{
  "summary": "One sentence summary",
  "targetArchitecture": "How files interconnect",
  "files": [{ "filePath": "...", "action": "create"|"modify"|"delete", "description": "...", "proposedContent": "FULL file content" }]
}`;

    const userMessage = `User request (intent: ${intent}): ${prompt}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ text: `${ragPreamble}\n\n${userMessage}` }],
          config: { maxOutputTokens: 8192, temperature: 0.2 },
        });
        const cleaned = (response.text || '').replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({
          success: true, source: 'gemini+rag',
          retrievedChunks: retrievedChunks.map(c => ({ filePath: c.filePath, lines: `${c.startLine}-${c.endLine}`, score: Math.round(c.score * 100) / 100, matchedTerms: c.matchedTerms })),
          summary: parsed.summary || `Implemented: ${prompt}`,
          targetArchitecture: parsed.targetArchitecture || 'RAG-guided multi-tier TypeScript architecture',
          files: parsed.files || [],
        });
      } catch (e: any) { console.warn('[rag-generate] Gemini failed:', e.message); }
    }

    try {
      const ollamaHealth = await checkOllamaHealth();
      if (ollamaHealth.online) {
        const availableModels = await listOllamaModels();
        const model = requestedModel || selectBestOllamaModel(availableModels);
        const raw = await generateOllamaText({ model, prompt: `${ragPreamble}\n\n${userMessage}`, temperature: 0.2 });
        const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const jsonStart = cleaned.indexOf('{'); const jsonEnd = cleaned.lastIndexOf('}');
        const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
        return NextResponse.json({
          success: true, source: `ollama:${model}+rag`,
          retrievedChunks: retrievedChunks.map(c => ({ filePath: c.filePath, lines: `${c.startLine}-${c.endLine}`, score: Math.round(c.score * 100) / 100, matchedTerms: c.matchedTerms })),
          summary: parsed.summary || `Implemented: ${prompt}`,
          targetArchitecture: parsed.targetArchitecture || 'Local RAG-guided architecture',
          files: parsed.files || [],
        });
      }
    } catch (e) { console.warn('[rag-generate] Ollama failed:', e); }

    return NextResponse.json({
      success: false, source: 'retrieval-only',
      retrievedChunks: retrievedChunks.map(c => ({ filePath: c.filePath, lines: `${c.startLine}-${c.endLine}`, score: Math.round(c.score * 100) / 100, matchedTerms: c.matchedTerms })),
      error: 'No AI backend available. Configure Ollama or GEMINI_API_KEY.',
      files: [],
    }, { status: 503 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
