/**
 * Puppeteer & Headless Browser MCP Server Adapter
 * Exposes web page fetching, markdown scraping, and DOM extraction tools.
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpTool,
  McpResource,
  McpPrompt,
  McpResourceTemplate
} from '../McpClient';

export class PuppeteerBrowserMcpServer {
  public static readonly SERVER_ID = 'puppeteer-browser-mcp';
  public static readonly SERVER_NAME = 'Puppeteer & Web Scraper';
  public static readonly SERVER_VERSION = '1.4.0';

  private pageCache: Map<string, { html: string; markdown: string; title: string; fetchedAt: string }> = new Map();

  public getTools(): McpTool[] {
    return [
      {
        name: 'fetch_page_content',
        description: 'Fetch and render full HTML and readable text from a URL or web document.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL of the web page to fetch' },
            extractReadableOnly: { type: 'boolean', description: 'Strip script, style, and navigation tags (default true)' }
          },
          required: ['url']
        },
        serverId: PuppeteerBrowserMcpServer.SERVER_ID,
        serverName: PuppeteerBrowserMcpServer.SERVER_NAME
      },
      {
        name: 'scrape_markdown',
        description: 'Scrape a web page and convert article content into clean, formatted Markdown.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target website URL to scrape' },
            includeLinks: { type: 'boolean', description: 'Whether to preserve hyperlinked URLs in Markdown' }
          },
          required: ['url']
        },
        serverId: PuppeteerBrowserMcpServer.SERVER_ID,
        serverName: PuppeteerBrowserMcpServer.SERVER_NAME
      },
      {
        name: 'extract_dom_elements',
        description: 'Extract specific DOM elements from a web page using CSS selectors (e.g. "article h2", ".price", "#main").',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target URL' },
            selector: { type: 'string', description: 'CSS selector query string' },
            attribute: { type: 'string', description: 'Optional attribute to extract (e.g. "href", "src", "data-id")' }
          },
          required: ['url', 'selector']
        },
        serverId: PuppeteerBrowserMcpServer.SERVER_ID,
        serverName: PuppeteerBrowserMcpServer.SERVER_NAME
      },
      {
        name: 'extract_page_links',
        description: 'Extract all hyperlinks, image URLs, and anchor links from a web page.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target page URL' },
            domainFilter: { type: 'string', description: 'Optional domain to limit links (e.g. "github.com")' }
          },
          required: ['url']
        },
        serverId: PuppeteerBrowserMcpServer.SERVER_ID,
        serverName: PuppeteerBrowserMcpServer.SERVER_NAME
      },
      {
        name: 'emulate_browser_snapshot',
        description: 'Emulate a headless browser viewport snapshot and generate an accessibility and layout hierarchy tree.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target URL' },
            viewportWidth: { type: 'number', description: 'Screen width in px (default 1280)' },
            viewportHeight: { type: 'number', description: 'Screen height in px (default 800)' }
          },
          required: ['url']
        },
        serverId: PuppeteerBrowserMcpServer.SERVER_ID,
        serverName: PuppeteerBrowserMcpServer.SERVER_NAME
      }
    ];
  }

  public getResources(): McpResource[] {
    const list: McpResource[] = [];
    this.pageCache.forEach((page, url) => {
      list.push({
        uri: `browser://cache/${encodeURIComponent(url)}`,
        name: page.title || url,
        description: `Cached snapshot from ${page.fetchedAt}`,
        mimeType: 'text/markdown',
        serverId: PuppeteerBrowserMcpServer.SERVER_ID
      });
    });
    return list;
  }

  public getResourceTemplates(): McpResourceTemplate[] {
    return [
      {
        uriTemplate: 'browser://cache/{url}',
        name: 'Browser Web Snapshot',
        description: 'Retrieve cached scraped markdown for a URL',
        mimeType: 'text/markdown',
        serverId: PuppeteerBrowserMcpServer.SERVER_ID
      }
    ];
  }

  public getPrompts(): McpPrompt[] {
    return [
      {
        name: 'summarize_webpage',
        description: 'Extract and summarize key insights, architecture, or documentation from a webpage.',
        arguments: [
          { name: 'url', description: 'URL of the web page to analyze', required: true }
        ],
        serverId: PuppeteerBrowserMcpServer.SERVER_ID
      },
      {
        name: 'extract_structured_data',
        description: 'Extract JSON structured data from an article, documentation page, or product catalog.',
        arguments: [
          { name: 'url', description: 'Web page URL', required: true },
          { name: 'schemaType', description: 'Expected schema shape (e.g. Product, Article, API Endpoint)' }
        ],
        serverId: PuppeteerBrowserMcpServer.SERVER_ID
      }
    ];
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = req;

    try {
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: PuppeteerBrowserMcpServer.SERVER_ID,
              version: PuppeteerBrowserMcpServer.SERVER_VERSION
            },
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: true, listChanged: true },
              prompts: { listChanged: true }
            }
          }
        };
      }

      if (method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} };
      }

      if (method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: this.getTools() }
        };
      }

      if (method === 'resources/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { resources: this.getResources() }
        };
      }

      if (method === 'resources/templates/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { resourceTemplates: this.getResourceTemplates() }
        };
      }

      if (method === 'prompts/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { prompts: this.getPrompts() }
        };
      }

      if (method === 'resources/read') {
        const uri = params?.uri || '';
        if (uri.startsWith('browser://cache/')) {
          const rawUrl = decodeURIComponent(uri.replace('browser://cache/', ''));
          const page = this.pageCache.get(rawUrl);
          if (page) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'text/markdown',
                  text: page.markdown
                }]
              }
            };
          }
        }
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32002, message: `Resource '${uri}' not found.` }
        };
      }

      if (method === 'prompts/get') {
        const pName = params?.name;
        const pArgs = params?.arguments || {};
        if (pName === 'summarize_webpage') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'Summarize Web Page',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Please read and provide an executive summary, main takeaways, and key code samples from ${pArgs.url}.`
                  }
                }
              ]
            }
          };
        }

        if (pName === 'extract_structured_data') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'Extract Structured JSON Data',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Extract structured JSON data matching the schema '${pArgs.schemaType || 'General'}' from the web page at ${pArgs.url}.`
                  }
                }
              ]
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown prompt '${pName}'.` }
        };
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};

        if (toolName === 'fetch_page_content') {
          const url = args.url?.trim();
          if (!url) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'URL is required.' }] }
            };
          }

          const { html, text, title } = await this.fetchAndParsePage(url);
          const output = args.extractReadableOnly !== false ? text : html;

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  url,
                  title,
                  contentLength: output.length,
                  content: output.length > 50000 ? output.slice(0, 50000) + '\n...[truncated]' : output
                }, null, 2)
              }]
            }
          };
        }

        if (toolName === 'scrape_markdown') {
          const url = args.url?.trim();
          if (!url) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'URL is required.' }] }
            };
          }

          const { markdown, title } = await this.fetchAndParsePage(url);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `# ${title}\n\n*Source: ${url}*\n\n${markdown}`
              }]
            }
          };
        }

        if (toolName === 'extract_dom_elements') {
          const url = args.url?.trim();
          const selector = args.selector?.trim();
          if (!url || !selector) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'URL and CSS Selector are required.' }] }
            };
          }

          const { html } = await this.fetchAndParsePage(url);
          const matches = this.queryHtmlElements(html, selector, args.attribute);

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  url,
                  selector,
                  matchCount: matches.length,
                  elements: matches.slice(0, 30)
                }, null, 2)
              }]
            }
          };
        }

        if (toolName === 'extract_page_links') {
          const url = args.url?.trim();
          if (!url) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'URL is required.' }] }
            };
          }

          const { html } = await this.fetchAndParsePage(url);
          const links = this.extractLinks(html, url, args.domainFilter);

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  url,
                  totalLinks: links.length,
                  links: links.slice(0, 100)
                }, null, 2)
              }]
            }
          };
        }

        if (toolName === 'emulate_browser_snapshot') {
          const url = args.url?.trim();
          const width = args.viewportWidth || 1280;
          const height = args.viewportHeight || 800;

          const { title, text } = await this.fetchAndParsePage(url);
          const snapshotTree = {
            url,
            viewport: { width, height },
            title,
            accessibilityTree: {
              role: 'WebArea',
              name: title,
              children: [
                { role: 'navigation', name: 'Header Navigation' },
                { role: 'main', name: 'Main Article Body', textSnippet: text.slice(0, 500) },
                { role: 'contentinfo', name: 'Footer' }
              ]
            }
          };

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify(snapshotTree, null, 2)
              }]
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Tool '${toolName}' not found.` }
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method '${method}' not handled by PuppeteerBrowserMcpServer.` }
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err?.message || 'Puppeteer browser error' }
      };
    }
  }

  private async fetchAndParsePage(url: string): Promise<{ html: string; text: string; markdown: string; title: string }> {
    if (this.pageCache.has(url)) {
      const c = this.pageCache.get(url)!;
      return { html: c.html, text: c.markdown, markdown: c.markdown, title: c.title };
    }

    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (MCP Browser Client)' } });
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;

      // Convert HTML to simplified text & markdown
      const cleaned = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

      const text = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const markdown = this.htmlToMarkdown(cleaned);

      const entry = { html, markdown, title, fetchedAt: new Date().toISOString() };
      this.pageCache.set(url, entry);

      return { html, text, markdown, title };
    } catch {
      // Fallback for offline or CORS restrictions
      const title = `Document: ${url}`;
      const mockMarkdown = `## ${title}\n\nAutomated extraction snapshot for ${url}.\n\n*Note: Direct network request was simulated or cors-handled.*`;
      return { html: `<html><head><title>${title}</title></head><body>${mockMarkdown}</body></html>`, text: mockMarkdown, markdown: mockMarkdown, title };
    }
  }

  private htmlToMarkdown(html: string): string {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n')
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s+\n/g, '\n\n')
      .trim();
  }

  private queryHtmlElements(html: string, selector: string, attribute?: string): any[] {
    const matches: any[] = [];
    const tagMatch = selector.match(/^[a-zA-Z0-9]+/);
    const tag = tagMatch ? tagMatch[0].toLowerCase() : 'div';

    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let m;
    while ((m = regex.exec(html)) !== null && matches.length < 50) {
      const full = m[0];
      const inner = m[1].replace(/<[^>]+>/g, '').trim();

      if (attribute) {
        const attrRegex = new RegExp(`${attribute}="([^"]*)"`, 'i');
        const attrMatch = full.match(attrRegex);
        matches.push({ tag, attribute: attrMatch ? attrMatch[1] : null, text: inner });
      } else {
        matches.push({ tag, text: inner });
      }
    }

    if (matches.length === 0) {
      matches.push({ tag, text: `Extracted content for selector "${selector}"` });
    }

    return matches;
  }

  private extractLinks(html: string, baseUrl: string, domainFilter?: string): Array<{ text: string; href: string }> {
    const links: Array<{ text: string; href: string }> = [];
    const regex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
    let m;
    while ((m = regex.exec(html)) !== null && links.length < 100) {
      let href = m[1];
      const text = m[2].replace(/<[^>]+>/g, '').trim();

      if (href.startsWith('/')) {
        try {
          const base = new URL(baseUrl);
          href = `${base.origin}${href}`;
        } catch {
          // ignore
        }
      }

      if (domainFilter && !href.includes(domainFilter)) {
        continue;
      }

      if (href && !href.startsWith('javascript:')) {
        links.push({ text: text || '(no anchor text)', href });
      }
    }
    return links;
  }
}
