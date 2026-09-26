import { NextResponse } from 'next/server';
import { outlinesEngine, PREBUILT_OUTLINES_TEMPLATES } from '@/lib/ai/outlinesEngine';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      engine: 'outlines (outlines-dev/outlines)',
      version: '0.1.11',
      description: 'Finite State Machine (FSM) guided generation and schema constraints for local LLMs',
      supportedBackends: ['transformers', 'vllm', 'llama.cpp', 'ollama', 'mamba'],
      templates: PREBUILT_OUTLINES_TEMPLATES,
      totalTemplates: PREBUILT_OUTLINES_TEMPLATES.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to query Outlines engine' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, prompt, templateId, customSchema, customType, type } = body;

    switch (action) {
      case 'generate-guided': {
        let template = templateId ? PREBUILT_OUTLINES_TEMPLATES.find(t => t.id === templateId) : null;
        if (!template && customSchema) {
          template = {
            id: 'custom',
            name: 'Custom User Schema',
            type: customType || 'json_schema',
            description: 'Custom provided constraint',
            schemaOrPattern: customSchema,
            examplePrompt: prompt || 'Generate compliant output'
          };
        }
        if (!template) {
          template = PREBUILT_OUTLINES_TEMPLATES[0];
        }

        const res = await outlinesEngine.generateGuided(prompt || template.examplePrompt, template);
        return NextResponse.json({ success: true, result: res });
      }

      case 'compile-fsm': {
        const pattern = customSchema || PREBUILT_OUTLINES_TEMPLATES[0].schemaOrPattern;
        const fsmType = type || 'json_schema';
        const states = outlinesEngine.compileFsm(pattern, fsmType);
        return NextResponse.json({ success: true, states, totalStates: states.length });
      }

      case 'export-python': {
        const template = (templateId && PREBUILT_OUTLINES_TEMPLATES.find(t => t.id === templateId)) || PREBUILT_OUTLINES_TEMPLATES[0];
        const script = outlinesEngine.generatePythonScript(template);
        return NextResponse.json({ success: true, script });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Outlines generation failed' },
      { status: 500 }
    );
  }
}
