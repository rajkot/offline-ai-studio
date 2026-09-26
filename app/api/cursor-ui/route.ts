import { NextRequest, NextResponse } from 'next/server';
import {
  cursorModernUiEngine,
  BETTER_COMMENTS_RULES,
  PEACOCK_PALETTES,
  INDENT_RAINBOW_PALETTE,
  DEFAULT_SETTINGS_JSON
} from '@/lib/ui/cursorModernUiEngine';

export async function GET() {
  try {
    const settings = cursorModernUiEngine.getSettings();
    const extensionState = cursorModernUiEngine.getExtensionState();
    const activePeacock = cursorModernUiEngine.getActivePeacock();
    const glassOpacity = cursorModernUiEngine.getGlassOpacity();

    return NextResponse.json({
      status: 'online',
      suite: 'Cursor & v0 Ultra-Modern UI/UX Suite',
      settings,
      extensionState,
      activePeacock,
      glassOpacity,
      peacockPalettes: PEACOCK_PALETTES,
      betterCommentsRules: BETTER_COMMENTS_RULES,
      indentRainbowPalette: INDENT_RAINBOW_PALETTE,
      defaultSettingsJson: DEFAULT_SETTINGS_JSON,
      extensions: [
        { id: 'apcCustomizeUi', name: 'APC Customize UI Plus', purpose: 'Customizes header bar, sidebar size, and hidden titlebars' },
        { id: 'glassDarkTheme', name: 'Glass-Dark Obsidian Theme', purpose: 'Tokyo Night / Vesper / Obsidian deep dark palette (#09090b)' },
        { id: 'materialIcons', name: 'Material Icon Theme', purpose: 'Crisp icons for 60+ language file extensions' },
        { id: 'glassitVibrancy', name: 'Glassit / Vibrancy', purpose: 'Translucent window blur and acrylic glassmorphism' },
        { id: 'errorLens', name: 'Error Lens', purpose: 'Inline glowing colored highlights for warnings and errors directly on the code line' },
        { id: 'peacock', name: 'Peacock Project Tinting', purpose: 'Color-coded borders and status bar to differentiate workspaces' },
        { id: 'indentRainbow', name: 'Indent Rainbow', purpose: '4-color soft pastel vertical indent guides on nested code blocks' },
        { id: 'fluentIcons', name: 'Fluent Icons', purpose: 'Refined modern UI icons across toolbars' },
        { id: 'projectManager', name: 'Project Manager', purpose: 'Single-click and hotkey-driven project switching' },
        { id: 'betterComments', name: 'Better Comments', purpose: 'Color-coded highlights for // TODO:, // FIXME:, // !, // ?, // *' }
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, settingsJson, extensionKey, themeId, opacity } = body;

    if (action === 'applySettingsJson') {
      const res = cursorModernUiEngine.applySettingsJson(settingsJson);
      return NextResponse.json({
        ...res,
        settings: cursorModernUiEngine.getSettings()
      });
    }

    if (action === 'toggleExtension') {
      if (!extensionKey) {
        return NextResponse.json({ error: 'extensionKey is required' }, { status: 400 });
      }
      cursorModernUiEngine.toggleExtension(extensionKey as any);
      return NextResponse.json({
        success: true,
        extensionState: cursorModernUiEngine.getExtensionState()
      });
    }

    if (action === 'setPeacock') {
      if (!themeId) {
        return NextResponse.json({ error: 'themeId is required' }, { status: 400 });
      }
      cursorModernUiEngine.setPeacock(themeId);
      return NextResponse.json({
        success: true,
        activePeacock: cursorModernUiEngine.getActivePeacock()
      });
    }

    if (action === 'setGlassOpacity') {
      if (typeof opacity !== 'number') {
        return NextResponse.json({ error: 'opacity must be a number' }, { status: 400 });
      }
      cursorModernUiEngine.setGlassOpacity(opacity);
      return NextResponse.json({
        success: true,
        glassOpacity: cursorModernUiEngine.getGlassOpacity()
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
