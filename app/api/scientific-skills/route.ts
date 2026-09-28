import { NextRequest, NextResponse } from 'next/server';
import { scientificSkillsEngine } from '@/lib/ai/scientificSkillsEngine';
import { generateOllamaText, checkOllamaHealth } from '@/lib/ai/ollamaClient';
import { generateWithOnlineAi } from '@/lib/ai/onlineAiEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || undefined;
    const query = searchParams.get('q') || searchParams.get('query') || undefined;
    const skillId = searchParams.get('id');

    if (skillId) {
      const skill = scientificSkillsEngine.getSkillById(skillId);
      if (!skill) {
        return NextResponse.json({ error: `Skill '${skillId}' not found` }, { status: 404 });
      }
      return NextResponse.json({ skill });
    }

    const skills = scientificSkillsEngine.searchSkills(query || '', domain);
    const categories = scientificSkillsEngine.getCategories();
    const total = scientificSkillsEngine.getAllSkills().length;

    return NextResponse.json({
      status: 'ready',
      total,
      filteredCount: skills.length,
      categories,
      skills
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch scientific skills' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, skillId, task, context = '', model = 'qwen2.5:1.5b', useOnlineAi = false } = body;

    if (action === 'buildPrompt') {
      const prompt = scientificSkillsEngine.buildScientificPrompt(skillId || 'bio-crispr-guide-design', task || '', context);
      return NextResponse.json({ success: true, prompt });
    }

    if (action === 'executeSkill' || action === 'run') {
      if (!skillId) {
        return NextResponse.json({ error: 'skillId is required' }, { status: 400 });
      }
      if (!task || !task.trim()) {
        return NextResponse.json({ error: 'task is required' }, { status: 400 });
      }

      const skill = scientificSkillsEngine.getSkillById(skillId);
      const prompt = scientificSkillsEngine.buildScientificPrompt(skillId, task, context);

      const start = Date.now();
      let outputText = '';
      let usedEngine = 'ollama';

      if (!useOnlineAi) {
        const health = await checkOllamaHealth();
        if (health.online) {
          outputText = await generateOllamaText({
            model: model || 'qwen2.5:1.5b',
            prompt,
            temperature: 0.2
          });
          usedEngine = `Ollama (${model})`;
        } else {
          // Fallback to online AI
          const onlineRes = await generateWithOnlineAi({
            provider: 'omniroute',
            userPrompt: task,
            systemPrompt: skill?.systemPrompt,
            temperature: 0.2,
            maxTokens: 2500
          });
          outputText = onlineRes;
          usedEngine = 'Online AI (OmniRoute)';
        }
      } else {
        const onlineRes = await generateWithOnlineAi({
          provider: 'omniroute',
          userPrompt: task,
          systemPrompt: skill?.systemPrompt,
          temperature: 0.2,
          maxTokens: 2500
        });
        outputText = onlineRes;
        usedEngine = 'Online AI (OmniRoute)';
      }

      return NextResponse.json({
        success: true,
        skillId,
        skillName: skill?.name,
        domain: skill?.domainLabel,
        engine: usedEngine,
        durationMs: Date.now() - start,
        result: outputText,
        prompt
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process scientific skill' }, { status: 500 });
  }
}
