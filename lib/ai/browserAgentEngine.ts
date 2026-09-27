/**
 * Local Headless Browser & Visual Self-Correction Agent Engine
 *
 * Provides zero-download visual inspection, DOM auditing, console error tracking,
 * and base64 screenshot capture by connecting directly to existing system Microsoft Edge
 * or Google Chrome installations via playwright-core.
 */

function getNodeFs(): any {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      return eval('require')('fs');
    } catch {}
  }
  return null;
}

function getNodePath(): any {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      return eval('require')('path');
    } catch {}
  }
  return null;
}

export interface BrowserConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info';
  text: string;
  location?: string;
  timestamp: string;
}

export interface BrowserAuditResult {
  success: boolean;
  url: string;
  title: string;
  screenshotBase64?: string;
  consoleLogs: BrowserConsoleMessage[];
  errorsCount: number;
  warningsCount: number;
  domSummary: string;
  latencyMs: number;
  browserChannel: string;
  error?: string;
}

export interface BrowserAuditOptions {
  timeoutMs?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  captureScreenshot?: boolean;
  fullPage?: boolean;
  waitForSelector?: string;
}

export class BrowserAgentEngine {
  private preferredChannel: 'msedge' | 'chrome' | null = null;
  private knownBinaryPath: string | null = null;

  constructor() {
    this.detectBrowser();
  }

  /**
   * Auto-detects local Edge or Chrome installation paths on Windows.
   */
  public detectBrowser(): { available: boolean; channel: string | null; binaryPath: string | null } {
    const candidates = [
      {
        channel: 'msedge' as const,
        paths: [
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
        ]
      },
      {
        channel: 'chrome' as const,
        paths: [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ]
      }
    ];

    const fs = getNodeFs();
    if (fs) {
      for (const group of candidates) {
        for (const p of group.paths) {
          if (fs.existsSync(p)) {
            this.preferredChannel = group.channel;
            this.knownBinaryPath = p;
            return { available: true, channel: group.channel, binaryPath: p };
          }
        }
      }
    }

    return { available: false, channel: null, binaryPath: null };
  }

  /**
   * Retrieves current status of the local browser environment.
   */
  public getStatus() {
    const detection = this.detectBrowser();
    return {
      available: detection.available,
      channel: detection.channel || 'none',
      binaryPath: detection.binaryPath || 'not detected',
      engine: 'Playwright-Core Direct Native Bridge',
      supportedFeatures: [
        'Live DOM Extraction',
        'Viewport & Full-Page Base64 Screenshots',
        'Console Error & Hydration Mismatch Capture',
        'Visual Self-Correction Feedback Loop'
      ]
    };
  }

  /**
   * Audits a page by navigating headlessly, capturing console events, DOM, and visual screenshot.
   */
  public async auditPage(
    url: string,
    options: BrowserAuditOptions = {}
  ): Promise<BrowserAuditResult> {
    const startTime = Date.now();
    const timeout = options.timeoutMs || 10000;
    const shouldCaptureScreenshot = options.captureScreenshot !== false;

    // Dynamically require playwright-core
    let playwright: any;
    try {
      playwright = require('playwright-core');
    } catch {
      return {
        success: false,
        url,
        title: '',
        consoleLogs: [],
        errorsCount: 1,
        warningsCount: 0,
        domSummary: '',
        latencyMs: Date.now() - startTime,
        browserChannel: 'none',
        error: 'playwright-core package is not installed.'
      };
    }

    const { chromium } = playwright;
    const channel = this.preferredChannel || 'msedge';

    const consoleLogs: BrowserConsoleMessage[] = [];
    let browser: any = null;

    try {
      browser = await chromium.launch({
        channel,
        headless: true,
        args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
      });

      const context = await browser.newContext({
        viewport: {
          width: options.viewportWidth || 1280,
          height: options.viewportHeight || 800
        }
      });

      const page = await context.newPage();

      // Intercept browser console events
      page.on('console', (msg: any) => {
        const type = msg.type() as 'log' | 'warn' | 'error' | 'info';
        consoleLogs.push({
          type: type === 'error' || type === 'warn' || type === 'info' ? type : 'log',
          text: msg.text(),
          location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined,
          timestamp: new Date().toISOString()
        });
      });

      // Intercept unhandled exceptions
      page.on('pageerror', (err: any) => {
        consoleLogs.push({
          type: 'error',
          text: `[UnhandledException] ${err.message}\n${err.stack || ''}`,
          timestamp: new Date().toISOString()
        });
      });

      // Navigate to target URL
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout
      });

      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, { timeout: 3000 });
        } catch {}
      }

      // Extract title and DOM summary
      const title = (await page.title()) || 'Untitled';

      const domSummary = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .slice(0, 8)
          .map((h) => `${h.tagName}: ${h.textContent?.trim()}`);

        const buttons = Array.from(document.querySelectorAll('button'))
          .slice(0, 10)
          .map((b) => b.textContent?.trim() || '[Icon]');

        const forms = Array.from(document.querySelectorAll('input, textarea'))
          .slice(0, 6)
          .map((i: any) => `${i.tagName.toLowerCase()}[type=${i.type || 'text'}]`);

        return {
          headings,
          buttonsCount: document.querySelectorAll('button').length,
          buttonsSample: buttons,
          inputsCount: document.querySelectorAll('input, textarea').length,
          inputsSample: forms,
          bodyTextLength: document.body?.innerText?.length || 0
        };
      });

      // Capture screenshot if requested
      let screenshotBase64: string | undefined;
      if (shouldCaptureScreenshot) {
        screenshotBase64 = await page.screenshot({
          encoding: 'base64',
          fullPage: Boolean(options.fullPage)
        });
      }

      await browser.close();

      const errorsCount = consoleLogs.filter((l) => l.type === 'error').length;
      const warningsCount = consoleLogs.filter((l) => l.type === 'warn').length;

      return {
        success: true,
        url,
        title,
        screenshotBase64,
        consoleLogs,
        errorsCount,
        warningsCount,
        domSummary: JSON.stringify(domSummary, null, 2),
        latencyMs: Date.now() - startTime,
        browserChannel: channel
      };
    } catch (err: any) {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }

      return {
        success: false,
        url,
        title: '',
        consoleLogs,
        errorsCount: 1,
        warningsCount: 0,
        domSummary: '',
        latencyMs: Date.now() - startTime,
        browserChannel: channel,
        error: err.message || 'Page navigation failed or timed out.'
      };
    }
  }

  /**
   * Fast viewport screenshot utility returning base64 image data.
   */
  public async captureScreenshot(
    url: string,
    options?: { fullPage?: boolean; width?: number; height?: number }
  ) {
    const audit = await this.auditPage(url, {
      captureScreenshot: true,
      fullPage: options?.fullPage,
      viewportWidth: options?.width,
      viewportHeight: options?.height
    });

    return {
      success: audit.success,
      screenshotBase64: audit.screenshotBase64,
      title: audit.title,
      error: audit.error
    };
  }
}

export const browserAgentEngine = new BrowserAgentEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BrowserAgentEngine,
    browserAgentEngine
  };
}
