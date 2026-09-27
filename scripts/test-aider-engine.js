const assert = require('assert');

async function testAiderEngine() {
  console.log('[TEST] Checking Aider Pair Programmer & Tree-Sitter Repo-Map Subsystem...');

  const { aiderEngine, AiderEngine } = require('../lib/ai/aiderEngine');
  assert.ok(aiderEngine, 'aiderEngine singleton should exist');
  assert.ok(AiderEngine, 'AiderEngine class should be exported');

  // Test 1: Repo Map Generation with PageRank Centrality
  console.log('[TEST] Generating PageRank-weighted Repo Map...');
  const mockWorkspace = {
    'lib/core/database.ts': `
      export class DatabaseClient {
        connect(): boolean { return true; }
        query(sql: string): any[] { return []; }
      }
    `,
    'lib/services/userService.ts': `
      import { DatabaseClient } from '../core/database';
      export class UserService {
        constructor(private db: DatabaseClient) {}
        getUser(id: string) { return this.db.query("SELECT * FROM users"); }
      }
    `,
    'app/api/users/route.ts': `
      import { UserService } from '@/lib/services/userService';
      export async function GET() {
        return { users: [] };
      }
    `
  };

  const repoMapResult = aiderEngine.generateRepoMap(mockWorkspace, 1024);
  console.log('[TEST] Repo Map result:', {
    totalFiles: repoMapResult.totalFiles,
    totalSymbols: repoMapResult.totalSymbols,
    tokenCount: repoMapResult.tokenCount,
    topSymbols: repoMapResult.topRankedSymbols.map(s => `${s.name} (rank: ${s.rank.toFixed(2)})`)
  });

  assert.strictEqual(repoMapResult.totalFiles, 3, 'Should index all 3 files');
  assert.ok(repoMapResult.totalSymbols >= 3, 'Should extract at least 3 symbols');
  assert.ok(repoMapResult.mapText.includes('DatabaseClient'), 'Map must contain DatabaseClient');
  assert.ok(repoMapResult.mapText.includes('UserService'), 'Map must contain UserService');

  // DatabaseClient is referenced by userService, so its PageRank centrality should be higher
  const dbSym = repoMapResult.topRankedSymbols.find(s => s.name === 'DatabaseClient');
  assert.ok(dbSym, 'DatabaseClient must be in top ranked symbols');
  assert.ok(dbSym.rank >= 1.0, 'Referenced symbols must have boosted PageRank');

  // Test 2: Search/Replace Edit Block Parser
  console.log('[TEST] Testing Aider Search/Replace Edit Block Parsing...');
  const diffResponse = `
Here is the fix for the database query:

<<<<<<< SEARCH
        query(sql: string): any[] { return []; }
=======
        query(sql: string): any[] {
          console.log('Executing query:', sql);
          return [{ id: 1, name: 'Alice' }];
        }
>>>>>>>
  `;

  const blocks = aiderEngine.parseSearchReplaceBlocks(diffResponse, 'lib/core/database.ts');
  assert.strictEqual(blocks.length, 1, 'Should extract 1 edit block');
  assert.ok(blocks[0].before.includes('return [];'));
  assert.ok(blocks[0].after.includes('Executing query:'));

  // Test 3: Atomic Edit Block Application
  console.log('[TEST] Testing Atomic Edit Block Application...');
  const originalCode = mockWorkspace['lib/core/database.ts'];
  const applyResult = aiderEngine.applyEditBlock(originalCode, blocks[0]);
  assert.strictEqual(applyResult.success, true, 'Diff block should apply successfully');
  assert.ok(applyResult.newContent.includes('Executing query:'), 'Applied text must contain new code');

  console.log('[TEST] All Aider Tree-Sitter Repo-Map & Diff Engine tests passed successfully! ✓');
}

testAiderEngine().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
