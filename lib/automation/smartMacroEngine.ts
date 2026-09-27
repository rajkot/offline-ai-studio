/**
 * Smart Macro Automation & Web/CRM Auto-Filler Engine
 *
 * Combines Playwright DOM & accessibility inspection with NanoJev's 15ms parallel
 * logit decision heads to provide break-resistant, semantic web form filling,
 * CRM data entry, and repetitive task automation without brittle X/Y coordinates.
 */

import { nanoJevEngine } from '../ai/nanoJevEngine';
import { browserAgentEngine } from '../ai/browserAgentEngine';

export interface SmartMacroStep {
  id: string;
  action: 'navigate' | 'smartFill' | 'smartClick' | 'selectOption' | 'wait' | 'checkPopup';
  targetIntent?: string;       // e.g. "Full Name", "Customer Phone", "Save CRM Lead"
  value?: string;              // Static value or template (e.g., "{{csv.phone}}")
  csvField?: string;           // Key from uploaded CSV/JSON row
  options?: {
    timeoutMs?: number;
    optional?: boolean;        // Skip step gracefully if not found
    confirmDialog?: boolean;   // Auto-dismiss native alerts/dialogs
    delayAfterMs?: number;     // Human typing cadence
  };
}

export interface SmartMacroDefinition {
  id: string;
  name: string;
  description?: string;
  targetUrl: string;
  mode: 'browser' | 'desktop_app';
  csvData?: Array<Record<string, string>>;
  steps: SmartMacroStep[];
  concurrency?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DOMElementCandidate {
  id?: string;
  tagName: string;
  type?: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  text?: string;
  selector?: string;
  visible?: boolean;
}

export interface MacroProgressEvent {
  stepIndex: number;
  totalSteps: number;
  rowIndex: number;
  totalRows: number;
  status: 'running' | 'step_success' | 'step_failed' | 'row_completed' | 'batch_completed';
  message: string;
  targetIntent?: string;
  timestamp: string;
  confidence?: number;
}

export interface MacroValidationResult {
  valid: boolean;
  errors: string[];
}

export class SmartMacroEngine {
  /**
   * Replaces `{{csv.fieldName}}` or `{{fieldName}}` tokens in a template string
   * with values from the given data record.
   */
  public substituteVariables(template: string, data: Record<string, string>): string {
    if (!template) return '';
    return template.replace(/\{\{(?:csv\.)?([a-zA-Z0-9_-]+)\}\}/g, (match, key) => {
      if (data && key in data) {
        return data[key] ?? '';
      }
      return match;
    });
  }

  /**
   * Validates a macro definition for mandatory fields, targetUrl, and step validity.
   */
  public validateMacro(macro: Partial<SmartMacroDefinition>): MacroValidationResult {
    const errors: string[] = [];

    if (!macro) {
      return { valid: false, errors: ['Macro definition is empty or null'] };
    }
    if (!macro.id || typeof macro.id !== 'string') {
      errors.push('Macro "id" is required and must be a string.');
    }
    if (!macro.targetUrl || typeof macro.targetUrl !== 'string') {
      errors.push('Macro "targetUrl" is required.');
    }
    if (!macro.steps || !Array.isArray(macro.steps) || macro.steps.length === 0) {
      errors.push('Macro "steps" must contain at least one step.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Evaluates interactive element candidates against a target intent using NanoJev logits.
   * Runs in sub-15ms locally without autoregressive latency.
   */
  public async matchElementWithNanoJev(
    targetIntent: string,
    candidates: DOMElementCandidate[]
  ): Promise<{ bestCandidate: DOMElementCandidate; confidence: number; scores: Record<string, number> }> {
    if (!candidates || candidates.length === 0) {
      throw new Error('No candidate elements provided for matching.');
    }

    if (candidates.length === 1) {
      return {
        bestCandidate: candidates[0],
        confidence: 1.0,
        scores: { [this.getCandidateIdentifier(candidates[0], 0)]: 1.0 }
      };
    }

    // 1. Format candidate tokens and descriptions
    const candidateStrings: string[] = [];
    const idMap: Record<string, DOMElementCandidate> = {};

    candidates.forEach((c, idx) => {
      const baseId = this.getCandidateIdentifier(c, idx);
      // Extract alphanumeric keywords from candidate attributes for logit head token matching
      const semanticWords = [
        c.name,
        c.placeholder,
        c.ariaLabel,
        c.text,
        c.type
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .split('_')
        .filter((w) => w.length > 2);

      const candidateKey = `${baseId}_${Array.from(new Set(semanticWords)).join('_')}`;
      candidateStrings.push(candidateKey);
      idMap[candidateKey] = c;
    });

    const state = `Target intent: ${targetIntent.toLowerCase()}. Find matching candidate element.`;

    // 2. Query NanoJev parallel decision heads
    const decision = await nanoJevEngine.evaluateDecisions(
      state,
      candidateStrings
    );

    // Extract the selected candidate key
    const selectedString = decision.selected;
    const matchedKey = Object.keys(idMap).find((k) => selectedString.startsWith(k)) || Object.keys(idMap)[0];
    const bestCandidate = idMap[matchedKey] || candidates[0];

    return {
      bestCandidate,
      confidence: decision.confidence,
      scores: decision.probabilities
    };
  }

  /**
   * Helper to generate unique candidate string identifier
   */
  private getCandidateIdentifier(candidate: DOMElementCandidate, index: number): string {
    return candidate.id || candidate.name || `candidate_${index}`;
  }

  /**
   * Inspects a live web page using Playwright and extracts interactive form elements.
   */
  public async inspectPageElements(url: string): Promise<DOMElementCandidate[]> {
    const playwright = this.getPlaywright();
    if (!playwright) {
      return [];
    }

    const browserInfo = browserAgentEngine.detectBrowser();
    const executablePath = browserInfo.binaryPath || undefined;

    let browser: any = null;
    try {
      browser = await playwright.chromium.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Extract form controls and buttons
      const elements: DOMElementCandidate[] = await page.evaluate(() => {
        const query = 'input, select, textarea, button, [role="button"], [role="textbox"]';
        const nodes = Array.from(document.querySelectorAll(query));
        return nodes.slice(0, 100).map((el, i) => {
          const htmlEl = el as HTMLElement;
          const inputEl = el as HTMLInputElement;
          const ariaLabel = htmlEl.getAttribute('aria-label') || '';
          const name = inputEl.name || htmlEl.getAttribute('name') || '';
          const id = htmlEl.id || '';
          const placeholder = inputEl.placeholder || htmlEl.getAttribute('placeholder') || '';
          const text = (htmlEl.innerText || htmlEl.textContent || '').trim().slice(0, 50);
          const type = inputEl.type || htmlEl.getAttribute('type') || '';
          const tagName = htmlEl.tagName.toLowerCase();

          // Best selector heuristic
          let selector = '';
          if (id) {
            selector = `#${id}`;
          } else if (name) {
            selector = `${tagName}[name="${name}"]`;
          } else if (placeholder) {
            selector = `${tagName}[placeholder="${placeholder}"]`;
          } else {
            selector = `${tagName}:nth-of-type(${i + 1})`;
          }

          return {
            id,
            tagName,
            type,
            name,
            placeholder,
            ariaLabel,
            text,
            selector,
            visible: htmlEl.offsetParent !== null
          };
        });
      });

      return elements;
    } catch (err) {
      console.error('[SmartMacroEngine] inspectPageElements failed:', err);
      return [];
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Executes a SmartMacro batch across the provided CSV/JSON dataset.
   */
  public async executeMacro(
    macro: SmartMacroDefinition,
    onProgress?: (event: MacroProgressEvent) => void
  ): Promise<{ success: boolean; totalProcessed: number; errors: string[] }> {
    const validation = this.validateMacro(macro);
    if (!validation.valid) {
      return { success: false, totalProcessed: 0, errors: validation.errors };
    }

    const rows = macro.csvData && macro.csvData.length > 0 ? macro.csvData : [{}];
    const errors: string[] = [];
    const playwright = this.getPlaywright();
    const browserInfo = browserAgentEngine.detectBrowser();

    if (!playwright) {
      return { success: false, totalProcessed: 0, errors: ['Playwright is not available in current environment'] };
    }

    let browser: any = null;
    let totalProcessed = 0;

    try {
      browser = await playwright.chromium.launch({
        executablePath: browserInfo.binaryPath || undefined,
        headless: false, // Show browser during user macro execution so user sees automation
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
      });

      const context = await browser.newContext({ viewport: null });
      const page = await context.newPage();

      // Auto-handle popups
      page.on('dialog', async (dialog: any) => {
        onProgress?.({
          stepIndex: 0,
          totalSteps: macro.steps.length,
          rowIndex: totalProcessed,
          totalRows: rows.length,
          status: 'running',
          message: `Dismissing alert popup: "${dialog.message()}"`,
          timestamp: new Date().toISOString()
        });
        await dialog.accept().catch(() => {});
      });

      // Loop through each dataset row
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];

        onProgress?.({
          stepIndex: 0,
          totalSteps: macro.steps.length,
          rowIndex: r + 1,
          totalRows: rows.length,
          status: 'running',
          message: `Starting row ${r + 1} of ${rows.length}`,
          timestamp: new Date().toISOString()
        });

        for (let s = 0; s < macro.steps.length; s++) {
          const step = macro.steps[s];
          const timeout = step.options?.timeoutMs || 8000;

          try {
            switch (step.action) {
              case 'navigate': {
                const target = this.substituteVariables(step.value || macro.targetUrl, row);
                await page.goto(target, { waitUntil: 'domcontentloaded', timeout });
                break;
              }

              case 'smartFill': {
                let valueToFill = step.value ? this.substituteVariables(step.value, row) : '';
                if (step.csvField && row[step.csvField]) {
                  valueToFill = row[step.csvField];
                }

                // If intent is specified, use NanoJev to match target
                if (step.targetIntent) {
                  const elements = await this.getPageCandidates(page);
                  const match = await this.matchElementWithNanoJev(step.targetIntent, elements);
                  const selector = match.bestCandidate.selector || `[name="${match.bestCandidate.name}"]`;

                  await page.waitForSelector(selector, { timeout });
                  await page.fill(selector, valueToFill);
                }
                break;
              }

              case 'smartClick': {
                if (step.targetIntent) {
                  const elements = await this.getPageCandidates(page);
                  const match = await this.matchElementWithNanoJev(step.targetIntent, elements);
                  const selector = match.bestCandidate.selector || `button:has-text("${match.bestCandidate.text}")`;

                  await page.waitForSelector(selector, { timeout });
                  await page.click(selector);
                }
                break;
              }

              case 'wait': {
                const ms = parseInt(step.value || '1000', 10);
                await page.waitForTimeout(ms);
                break;
              }
            }

            onProgress?.({
              stepIndex: s + 1,
              totalSteps: macro.steps.length,
              rowIndex: r + 1,
              totalRows: rows.length,
              status: 'step_success',
              message: `Executed step "${step.action}" for ${step.targetIntent || step.id}`,
              targetIntent: step.targetIntent,
              timestamp: new Date().toISOString()
            });

            if (step.options?.delayAfterMs) {
              await page.waitForTimeout(step.options.delayAfterMs);
            }
          } catch (stepErr: any) {
            const msg = `Step ${s + 1} (${step.action}) failed on row ${r + 1}: ${stepErr.message}`;
            errors.push(msg);
            onProgress?.({
              stepIndex: s + 1,
              totalSteps: macro.steps.length,
              rowIndex: r + 1,
              totalRows: rows.length,
              status: 'step_failed',
              message: msg,
              timestamp: new Date().toISOString()
            });

            if (!step.options?.optional) {
              break; // Stop row on mandatory step error
            }
          }
        }

        totalProcessed++;
        onProgress?.({
          stepIndex: macro.steps.length,
          totalSteps: macro.steps.length,
          rowIndex: r + 1,
          totalRows: rows.length,
          status: 'row_completed',
          message: `Completed row ${r + 1} of ${rows.length}`,
          timestamp: new Date().toISOString()
        });
      }

      onProgress?.({
        stepIndex: macro.steps.length,
        totalSteps: macro.steps.length,
        rowIndex: rows.length,
        totalRows: rows.length,
        status: 'batch_completed',
        message: `Macro batch completed. ${totalProcessed} rows processed with ${errors.length} errors.`,
        timestamp: new Date().toISOString()
      });

      return {
        success: errors.length === 0,
        totalProcessed,
        errors
      };
    } catch (err: any) {
      errors.push(`Macro run error: ${err.message}`);
      return { success: false, totalProcessed, errors };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  private async getPageCandidates(page: any): Promise<DOMElementCandidate[]> {
    return await page.evaluate(() => {
      const query = 'input, select, textarea, button, [role="button"], [role="textbox"]';
      const nodes = Array.from(document.querySelectorAll(query));
      return nodes.slice(0, 100).map((el, i) => {
        const htmlEl = el as HTMLElement;
        const inputEl = el as HTMLInputElement;
        const id = htmlEl.id || '';
        const name = inputEl.name || htmlEl.getAttribute('name') || '';
        const placeholder = inputEl.placeholder || htmlEl.getAttribute('placeholder') || '';
        const ariaLabel = htmlEl.getAttribute('aria-label') || '';
        const text = (htmlEl.innerText || htmlEl.textContent || '').trim().slice(0, 50);
        const type = inputEl.type || htmlEl.getAttribute('type') || '';
        const tagName = htmlEl.tagName.toLowerCase();

        let selector = '';
        if (id) selector = `#${id}`;
        else if (name) selector = `${tagName}[name="${name}"]`;
        else if (placeholder) selector = `${tagName}[placeholder="${placeholder}"]`;
        else selector = `${tagName}:nth-of-type(${i + 1})`;

        return {
          id,
          tagName,
          type,
          name,
          placeholder,
          ariaLabel,
          text,
          selector,
          visible: htmlEl.offsetParent !== null
        };
      });
    });
  }

  private getPlaywright(): any {
    try {
      return eval('require')('playwright-core');
    } catch {
      return null;
    }
  }
}

export const smartMacroEngine = new SmartMacroEngine();

// CommonJS export fallback for direct node script executions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SmartMacroEngine,
    smartMacroEngine
  };
}
