const assert = require('assert');
const path = require('path');

// Test the CodeKnowledgeGraphEngine
async function runTests() {
  console.log('🧪 Starting Deterministic Code Knowledge Graph Test Suite...');

  // We require the compiled or ts-node/transpiled engine
  const { CodeKnowledgeGraphEngine } = require('../lib/ast/codeKnowledgeGraphEngine');
  const engine = new CodeKnowledgeGraphEngine();

  const file1 = 'src/mathUtils.ts';
  const content1 = `
export interface CalculationResult {
  value: number;
  formatted: string;
}

/**
 * Adds two numbers and returns formatted result.
 */
export function add(a: number, b: number): CalculationResult {
  return { value: a + b, formatted: String(a + b) };
}

export class MathWorker {
  multiply(x: number, y: number): number {
    return x * y;
  }
}
`;

  const file2 = 'src/calculator.tsx';
  const content2 = `
import React from 'react';
import { add, CalculationResult, MathWorker } from './mathUtils';

export const CalculatorComponent = () => {
  const result: CalculationResult = add(10, 20);
  const worker = new MathWorker();
  const mult = worker.multiply(2, 5);
  return <div className="calc-box">{result.formatted} - {mult}</div>;
};
`;

  console.log('1. Indexing workspace files...');
  const indexResult = engine.indexWorkspace({
    [file1]: content1,
    [file2]: content2
  });

  console.log(`   Indexed ${indexResult.totalNodes} nodes, ${indexResult.totalEdges} edges in ${indexResult.durationMs}ms`);
  assert(indexResult.totalNodes >= 4, `Expected at least 4 nodes, got ${indexResult.totalNodes}`);
  assert(indexResult.totalEdges >= 2, `Expected at least 2 edges, got ${indexResult.totalEdges}`);

  console.log('2. Verifying symbol extraction...');
  const addFn = engine.getSymbol('add');
  assert(addFn, 'Expected symbol "add" to be indexed');
  assert.strictEqual(addFn.type, 'function');
  assert.strictEqual(addFn.filePath, file1);
  assert(addFn.docstring && addFn.docstring.includes('Adds two numbers'), 'Expected docstring on add()');

  const calcInterface = engine.getSymbol('CalculationResult');
  assert(calcInterface, 'Expected symbol "CalculationResult" to be indexed');
  assert.strictEqual(calcInterface.type, 'interface');

  const calcComp = engine.getSymbol('CalculatorComponent');
  assert(calcComp, 'Expected symbol "CalculatorComponent" to be indexed');
  assert(calcComp.type === 'component' || calcComp.type === 'function', 'Expected component or function kind');

  console.log('3. Verifying cross-file relationship edges...');
  const edges = engine.getEdges();
  
  // Verify imports edge
  const importEdge = edges.find(e => e.source.includes(file2) && e.type === 'imports');
  assert(importEdge, 'Expected imports edge from calculator.tsx');

  // Verify calls edge
  const callsEdge = edges.find(e => e.type === 'calls' && e.target.includes('add'));
  assert(callsEdge, 'Expected calls edge targeting "add"');

  console.log('4. Verifying Graph-RAG context generation...');
  const ragContext = engine.getGraphRAGContext(file2);
  assert(ragContext, 'Expected non-empty Graph-RAG context');
  assert(ragContext.includes('CalculationResult'), 'Context should mention CalculationResult');
  assert(ragContext.includes('add'), 'Context should mention add()');
  console.log('   Graph-RAG Context Preview:');
  console.log('   ' + ragContext.split('\n').slice(0, 5).join('\n   ') + '...');

  console.log('5. Verifying Symbol Search...');
  const searchResults = engine.search('multiply');
  assert(searchResults.length > 0, 'Expected to find symbol "multiply"');
  assert(searchResults[0].node.name === 'multiply', 'First result should be "multiply"');

  console.log('✅ ALL CODE KNOWLEDGE GRAPH TESTS PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
