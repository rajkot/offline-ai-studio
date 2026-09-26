import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface SuperpowerSkill {
  id: string;
  name: string;
  description: string;
  category: 'workflow' | 'quality' | 'collaboration' | 'infrastructure';
  stage: number;
  stageName: string;
  icon: string;
  content?: string;
}

const SKILL_METADATA: Record<string, { category: 'workflow' | 'quality' | 'collaboration' | 'infrastructure'; stage: number; stageName: string; icon: string }> = {
  'using-superpowers': { category: 'workflow', stage: 0, stageName: 'Rule & Skill Dispatcher', icon: '⚡' },
  'brainstorming': { category: 'workflow', stage: 1, stageName: '1. Brainstorm & Clarify', icon: '💡' },
  'writing-plans': { category: 'workflow', stage: 2, stageName: '2. Specification & Planning', icon: '📋' },
  'test-driven-development': { category: 'quality', stage: 3, stageName: '3. Red-Green-Refactor TDD', icon: '🧪' },
  'executing-plans': { category: 'workflow', stage: 4, stageName: '4. Phased Execution', icon: '⚙️' },
  'subagent-driven-development': { category: 'workflow', stage: 5, stageName: '5. Subagent Architecture', icon: '🤖' },
  'dispatching-parallel-agents': { category: 'workflow', stage: 5, stageName: '5. Parallel Agent Swarm', icon: '⚡' },
  'systematic-debugging': { category: 'quality', stage: 3, stageName: 'Hypothesis Root-Cause Debugging', icon: '🔍' },
  'requesting-code-review': { category: 'collaboration', stage: 6, stageName: '6. Automated Code Review', icon: '🛡️' },
  'receiving-code-review': { category: 'collaboration', stage: 6, stageName: '6. Feedback Incorporation', icon: '✍️' },
  'verification-before-completion': { category: 'quality', stage: 6, stageName: 'Pre-Completion Verification', icon: '✅' },
  'finishing-a-development-branch': { category: 'infrastructure', stage: 7, stageName: '7. Git Branch Completion', icon: '🚀' },
  'using-git-worktrees': { category: 'infrastructure', stage: 7, stageName: 'Isolated Git Worktrees', icon: '🌿' },
  'writing-skills': { category: 'workflow', stage: 0, stageName: 'Skill Authoring Engine', icon: '🛠️' },
  'diagnosing-superpowers': { category: 'infrastructure', stage: 0, stageName: 'Framework Diagnostics', icon: '🩺' }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const skillId = searchParams.get('skill');

    const baseSkillsPath = path.join(process.cwd(), '.agents', 'skills');
    const fallbackSkillsPath = path.join(process.cwd(), 'superpowers', 'skills');

    const skillsDir = fs.existsSync(baseSkillsPath) ? baseSkillsPath : fallbackSkillsPath;

    if (!fs.existsSync(skillsDir)) {
      return NextResponse.json({ error: 'Superpowers skills directory not found' }, { status: 404 });
    }

    if (skillId) {
      const skillPath = path.join(skillsDir, skillId, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        return NextResponse.json({ error: `Skill "${skillId}" not found` }, { status: 404 });
      }

      const content = fs.readFileSync(skillPath, 'utf8');
      const meta = SKILL_METADATA[skillId] || { category: 'workflow', stage: 1, stageName: 'General', icon: '⚡' };

      return NextResponse.json({
        id: skillId,
        name: skillId,
        content,
        ...meta
      });
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: SuperpowerSkill[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFilePath = path.join(skillsDir, entry.name, 'SKILL.md');
        let description = 'Superpowers development methodology skill.';
        let name = entry.name;

        if (fs.existsSync(skillFilePath)) {
          const raw = fs.readFileSync(skillFilePath, 'utf8');
          const descMatch = raw.match(/description:\s*(.+)/i);
          if (descMatch) description = descMatch[1].trim();
          const nameMatch = raw.match(/name:\s*(.+)/i);
          if (nameMatch) name = nameMatch[1].trim();
        }

        const meta = SKILL_METADATA[entry.name] || {
          category: 'workflow',
          stage: 1,
          stageName: 'General',
          icon: '⚡'
        };

        skills.push({
          id: entry.name,
          name,
          description,
          category: meta.category,
          stage: meta.stage,
          stageName: meta.stageName,
          icon: meta.icon
        });
      }
    }

    skills.sort((a, b) => a.stage - b.stage || a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      count: skills.length,
      methodology: [
        { stage: 1, title: 'Brainstorm & Clarify', description: 'Interactive Socratic clarification & spec generation before writing code' },
        { stage: 2, title: 'Architect & Plan', description: 'Decompose feature into bite-sized testable units, DRY & YAGNI' },
        { stage: 3, title: 'Red-Green-Refactor TDD', description: 'Enforce failing tests first, then implement minimal passing code' },
        { stage: 4, title: 'Subagent Execution', description: 'Parallel or isolated autonomous subagents executing plan tasks' },
        { stage: 5, title: 'Hypothesis Debugging', description: 'Systematic root-cause tracing rather than trial-and-error edits' },
        { stage: 6, title: 'Code Review & Audit', description: 'Automated adversarial code review for security & invariants' },
        { stage: 7, title: 'Branch Finish & Ship', description: 'Git worktree clean-up, conventional commit squashes, and PR readying' }
      ],
      skills
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list superpowers' }, { status: 500 });
  }
}
