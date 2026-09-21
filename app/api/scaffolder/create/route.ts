import { NextRequest, NextResponse } from 'next/server';

export interface ScaffolderPlanRequest {
  description: string;
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    features: string[];
  };
  selectedFiles?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ScaffolderPlanRequest = await req.json();
    const { description = 'Web Application', techStack, selectedFiles } = body;

    const frontend = techStack?.frontend || 'React';
    const backend = techStack?.backend || 'Express';
    const database = techStack?.database || 'SQLite';
    const features = techStack?.features || [];

    // Generate custom code files based on user request & stack
    const files: Record<string, string> = {};

    // 1. Root Configs
    files['package.json'] = JSON.stringify(
      {
        name: description.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 24) || 'scaffolded-app',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: frontend === 'Next.js' ? 'next dev' : 'vite',
          build: frontend === 'Next.js' ? 'next build' : 'tsc && vite build',
          start: backend !== 'None' ? 'node server.js' : 'vite preview',
          test: 'vitest run'
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
          ...(frontend === 'Next.js' ? { next: '^15.0.0' } : {}),
          ...(backend === 'Express' ? { express: '^4.19.2', cors: '^2.8.5' } : {}),
          ...(database === 'MongoDB' ? { mongoose: '^8.4.0' } : {}),
          ...(database === 'SQLite' ? { 'better-sqlite3': '^9.6.0' } : {}),
          'lucide-react': '^0.395.0'
        },
        devDependencies: {
          typescript: '^5.4.5',
          vite: '^5.2.11',
          tailwindcss: '^3.4.3'
        }
      },
      null,
      2
    );

    files['README.md'] = `# ${description}

Scaffolded automatically via **AI Studio Architecture Planner**.

## Tech Stack
- **Frontend**: ${frontend}
- **Backend**: ${backend}
- **Database**: ${database}
- **Enabled Features**: ${features.join(', ') || 'Standard Build'}

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`
`;

    // 2. Frontend Files
    if (frontend === 'React' || frontend === 'Next.js') {
      files['src/App.tsx'] = `import React, { useState } from 'react';
import { Rocket, ShieldCheck, Database, Server, Cpu } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState('Scaffolded & Running');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-slate-800 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-950">
              <Rocket className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">${description}</h1>
              <p className="text-xs text-slate-400">Architecture: ${frontend} + ${backend} + ${database}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-semibold">
            ● {status}
          </span>
        </header>

        <grid className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <Server className="text-indigo-400 mb-2" size={20} />
            <h3 className="font-bold text-sm text-slate-200">Frontend Engine</h3>
            <p className="text-xs text-slate-400 mt-1">${frontend} framework with Tailwind CSS styling</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <Cpu className="text-cyan-400 mb-2" size={20} />
            <h3 className="font-bold text-sm text-slate-200">Backend API Service</h3>
            <p className="text-xs text-slate-400 mt-1">${backend !== 'None' ? backend + ' REST Server' : 'Client-side SPA Architecture'}</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <Database className="text-emerald-400 mb-2" size={20} />
            <h3 className="font-bold text-sm text-slate-200">Database Layer</h3>
            <p className="text-xs text-slate-400 mt-1">${database !== 'None' ? database + ' Persistence' : 'Local State / In-Memory'}</p>
          </div>
        </grid>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <h2 className="text-base font-bold text-slate-200 mb-2">🚀 Feature Overview</h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            This workspace was automatically scaffolded based on your input: 
            <em className="text-indigo-300 font-serif"> "${description}"</em>.
          </p>
          <div className="flex flex-wrap gap-2">
            ${features.map(f => `<span key="${f}" className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg">✓ ${f}</span>`).join('\n            ')}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

      files['src/index.css'] = `@import "tailwindcss";

body {
  margin: 0;
  background-color: #020617;
  color: #f8fafc;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
`;

      files['src/main.tsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    } else if (frontend === 'Vue') {
      files['src/App.vue'] = `<template>
  <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
    <h1 className="text-2xl font-bold">${description}</h1>
    <p className="text-xs text-slate-400 mt-2">Vue 3 Single File Component scaffolded successfully.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const title = ref('${description}');
</script>
`;
    } else {
      files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${description}</title>
  <script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>
</head>
<body class="bg-slate-950 text-slate-100 p-8">
  <h1 class="text-3xl font-bold text-indigo-400">${description}</h1>
  <p class="text-slate-400 mt-2">Scaffolded HTML5 static frontend boilerplate.</p>
</body>
</html>
`;
    }

    // 3. Backend Files
    if (backend === 'Express') {
      files['server/index.js'] = `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: '${description}',
    timestamp: new Date().toISOString()
  });
});

// Sample Resource Endpoint
app.get('/api/items', (req, res) => {
  res.json([
    { id: 1, name: 'Item Alpha', category: 'Core' },
    { id: 2, name: 'Item Beta', category: 'Secondary' }
  ]);
});

app.listen(PORT, () => {
  console.log(\`[Server] ${backend} API running on port \${PORT}\`);
});
`;
    } else if (backend === 'FastAPI') {
      files['server/main.py'] = `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="${description}")

@app.get("/api/health")
def health_check():
    return {"status": "online", "description": "${description}"}

@app.get("/api/items")
def get_items():
    return [
        {"id": 1, "name": "Python FastAPI Endpoint"},
        {"id": 2, "name": "Async Speed Performance"}
    ]
`;
    }

    // 4. Database Schema
    if (database === 'SQLite') {
      files['server/db.js'] = `const Database = require('better-sqlite3');
const db = new Database('app.db');

// Initialize Schema
db.exec(\`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
\`);

module.exports = db;
`;
    } else if (database === 'MongoDB') {
      files['server/models/Item.js'] = `const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', ItemSchema);
`;
    }

    // 5. Extra Features (Dockerfile, Tests)
    if (features.includes('Dockerfile')) {
      files['Dockerfile'] = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
    }

    if (features.includes('Unit Tests')) {
      files['tests/app.test.ts'] = `import { describe, it, expect } from 'vitest';

describe('${description} Invariants', () => {
  it('should initialize correctly', () => {
    expect(true).toBe(true);
  });
});
`;
    }

    // Filter files if selectedFiles array was specified
    let finalFiles = files;
    if (selectedFiles && selectedFiles.length > 0) {
      finalFiles = {};
      selectedFiles.forEach(path => {
        if (files[path]) {
          finalFiles[path] = files[path];
        }
      });
      // Always retain package.json & primary file
      if (files['package.json'] && !finalFiles['package.json']) {
        finalFiles['package.json'] = files['package.json'];
      }
    }

    const primaryFile = files['src/App.tsx']
      ? 'src/App.tsx'
      : files['src/App.vue']
      ? 'src/App.vue'
      : files['index.html']
      ? 'index.html'
      : Object.keys(finalFiles)[0];

    return NextResponse.json({
      success: true,
      message: `Successfully scaffolded ${Object.keys(finalFiles).length} project files.`,
      primaryFile,
      files: finalFiles,
      summary: {
        totalFiles: Object.keys(finalFiles).length,
        frontend,
        backend,
        database,
        features
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to scaffold project' },
      { status: 500 }
    );
  }
}
