import { NextResponse } from 'next/server';

export async function GET() {
  const templates = [
    {
      id: 'system_codegen',
      name: 'Code Generator Prompt',
      versions: [
        { version: 'v1.1.0', content: 'You are an expert developer. Output strictly standard TypeScript code without explanations. Emphasize type safety.' },
        { version: 'v1.0.0', content: 'You are a helpful coding assistant. Generate code based on the user request.' },
      ]
    },
    {
      id: 'system_verifier',
      name: 'Security Verifier Prompt',
      versions: [
        { version: 'v1.0.0', content: 'Analyze the provided code for security vulnerabilities. Check for XSS, SQLi, and path traversal.' },
        { version: 'v0.9.0', content: 'Check the code for bugs and basic security issues.' },
      ]
    }
  ];

  return NextResponse.json({ templates });
}
