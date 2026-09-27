/**
 * ByteDance UI-TARS Computer-Use & Desktop GUI Agent Engine
 *
 * Based on bytedance/UI-TARS (https://github.com/bytedance/UI-TARS)
 * Parses vision-language action syntax, converts normalized [0..1000] coordinates
 * to physical screen pixels, and enforces safety guards on desktop operations.
 */

export type UiTarsActionType =
  | 'click'
  | 'type'
  | 'hotkey'
  | 'scroll'
  | 'drag'
  | 'wait'
  | 'finished'
  | 'unknown';

export interface UiTarsParsedAction {
  action: UiTarsActionType;
  point?: [number, number];
  start?: [number, number];
  end?: [number, number];
  content?: string;
  key?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  thought?: string;
  rawActionText: string;
}

export class UiTarsEngine {
  private readonly BLOCKED_HOTKEYS = new Set([
    'alt+f4',
    'win+l',
    'ctrl+alt+del',
    'shift+del',
    'ctrl+shift+w'
  ]);

  private readonly DESTRUCTIVE_TYPE_PATTERNS = [
    /format\s+[a-z]:/i,
    /rm\s+-rf\s+\//i,
    /del\s+\/[a-z]\s+\/[a-z]/i,
    /rmdir\s+\/s/i,
    /drop\s+database/i,
    /shutdown\s+\/[a-z]/i
  ];

  /**
   * Parses raw UI-TARS model response text into a typed structured action.
   */
  public parseAction(modelOutput: string): UiTarsParsedAction {
    if (!modelOutput) {
      return { action: 'unknown', rawActionText: '' };
    }

    // Extract Thought if present
    let thought: string | undefined;
    const thoughtMatch = modelOutput.match(/Thought:\s*([\s\S]*?)(?=Action:|$)/i);
    if (thoughtMatch) {
      thought = thoughtMatch[1].trim();
    }

    // Extract Action statement
    const actionMatch = modelOutput.match(/Action:\s*([^\n\r]+)/i);
    const actionText = actionMatch ? actionMatch[1].trim() : modelOutput.trim();

    // 1. click(point=[x, y])
    const clickMatch = actionText.match(/click\s*\(\s*point\s*=\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]\s*\)/i);
    if (clickMatch) {
      return {
        action: 'click',
        point: [parseInt(clickMatch[1], 10), parseInt(clickMatch[2], 10)],
        thought,
        rawActionText: actionText
      };
    }

    // 2. type(content="...")
    const typeMatch = actionText.match(/type\s*\(\s*content\s*=\s*["']([\s\S]*?)["']\s*\)/i);
    if (typeMatch) {
      return {
        action: 'type',
        content: typeMatch[1],
        thought,
        rawActionText: actionText
      };
    }

    // 3. hotkey(key="...")
    const hotkeyMatch = actionText.match(/hotkey\s*\(\s*key\s*=\s*["']([^"']+)["']\s*\)/i);
    if (hotkeyMatch) {
      return {
        action: 'hotkey',
        key: hotkeyMatch[1].toLowerCase(),
        thought,
        rawActionText: actionText
      };
    }

    // 4. scroll(direction="...")
    const scrollMatch = actionText.match(/scroll\s*\(\s*direction\s*=\s*["'](up|down|left|right)["']\s*\)/i);
    if (scrollMatch) {
      return {
        action: 'scroll',
        direction: scrollMatch[1].toLowerCase() as any,
        thought,
        rawActionText: actionText
      };
    }

    // 5. drag(start=[x1, y1], end=[x2, y2])
    const dragMatch = actionText.match(/drag\s*\(\s*start\s*=\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]\s*,\s*end\s*=\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]\s*\)/i);
    if (dragMatch) {
      return {
        action: 'drag',
        start: [parseInt(dragMatch[1], 10), parseInt(dragMatch[2], 10)],
        end: [parseInt(dragMatch[3], 10), parseInt(dragMatch[4], 10)],
        thought,
        rawActionText: actionText
      };
    }

    // 6. finished()
    if (/finished\s*\(\s*\)/i.test(actionText)) {
      return {
        action: 'finished',
        thought,
        rawActionText: actionText
      };
    }

    // 7. wait()
    if (/wait\s*\(/i.test(actionText)) {
      return {
        action: 'wait',
        thought,
        rawActionText: actionText
      };
    }

    return {
      action: 'unknown',
      thought,
      rawActionText: actionText
    };
  }

  /**
   * Scales normalized coordinates [0..1000] to actual screen pixel resolutions.
   */
  public scaleCoordinates(
    point: [number, number],
    screenWidth: number,
    screenHeight: number
  ): [number, number] {
    const clampedX = Math.max(0, Math.min(1000, point[0]));
    const clampedY = Math.max(0, Math.min(1000, point[1]));

    const pxX = Math.round((clampedX / 1000) * screenWidth);
    const pxY = Math.round((clampedY / 1000) * screenHeight);

    return [pxX, pxY];
  }

  /**
   * Safety guard enforcing policies on destructive keyboard and command executions.
   */
  public validateActionSafety(action: UiTarsParsedAction): { safe: boolean; reason?: string } {
    if (action.action === 'hotkey' && action.key) {
      const normalizedKey = action.key.toLowerCase().replace(/\s+/g, '');
      if (this.BLOCKED_HOTKEYS.has(normalizedKey)) {
        return {
          safe: false,
          reason: `Blocked critical OS hotkey "${action.key}" to prevent application termination.`
        };
      }
    }

    if (action.action === 'type' && action.content) {
      for (const pattern of this.DESTRUCTIVE_TYPE_PATTERNS) {
        if (pattern.test(action.content)) {
          return {
            safe: false,
            reason: `Blocked destructive command execution signature: "${action.content}".`
          };
        }
      }
    }

    return { safe: true };
  }

  /**
   * Generates the standard UI-TARS system prompt instructing the VLM on action format.
   */
  public formatSystemPrompt(taskGoal: string): string {
    return `You are UI-TARS, a native GUI Agent operating on computer interfaces.
Goal: ${taskGoal}

Coordinate System:
All screen coordinates are normalized integers in the range [0..1000] for both X and Y.
[0, 0] is top-left, [1000, 1000] is bottom-right.

Allowed Actions:
1. click(point=[x, y])
2. type(content="...")
3. hotkey(key="ctrl+c")
4. scroll(direction="down|up")
5. drag(start=[x1, y1], end=[x2, y2])
6. wait(seconds=1)
7. finished()

Output Format:
Thought: <Concise reasoning about UI element location>
Action: <Single chosen action from list>`;
  }
}

export const uiTarsEngine = new UiTarsEngine();

// CommonJS export fallback for direct script executions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UiTarsEngine,
    uiTarsEngine
  };
}
