import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, settings } = await req.json();
    let sanitized = prompt;
    
    // Simulate redaction based on settings
    if (settings?.redactEmails) {
      sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    }
    if (settings?.maskCreditCards) {
      sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CC]');
    }
    if (settings?.hideApiKeys) {
      sanitized = sanitized.replace(/(sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z-_]{35})/g, '[REDACTED_API_KEY]');
    }
    if (settings?.filterPrivateIp) {
      sanitized = sanitized.replace(/\b(?:10\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)[0-9]{1,3}\.[0-9]{1,3}\b/g, '[REDACTED_IP]');
    }
    
    return NextResponse.json({ sanitizedPrompt: sanitized });
  } catch (error) {
    return NextResponse.json({ sanitizedPrompt: 'Error sanitizing prompt' }, { status: 500 });
  }
}
