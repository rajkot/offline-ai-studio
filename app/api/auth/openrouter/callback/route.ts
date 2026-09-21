import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(renderHtmlResult(false, '', `Authorization rejected: ${error}`), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (!code) {
    return new NextResponse(renderHtmlResult(false, '', 'No authorization code received from OpenRouter.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  try {
    // Exchange the code for an API key with OpenRouter
    const exchangeRes = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!exchangeRes.ok) {
      const errTxt = await exchangeRes.text();
      return new NextResponse(renderHtmlResult(false, '', `Token exchange failed: ${errTxt}`), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const data = await exchangeRes.json();
    const apiKey = data.key || data.api_key;

    if (!apiKey) {
      return new NextResponse(renderHtmlResult(false, '', 'OpenRouter did not return an API key in the response payload.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new NextResponse(renderHtmlResult(true, apiKey, 'Successfully connected OpenRouter with Direct Browser Login!'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (exchangeErr: any) {
    return new NextResponse(renderHtmlResult(false, '', `Authentication exception: ${exchangeErr.message}`), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

function renderHtmlResult(success: boolean, apiKey: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Offline AI Studio - OpenRouter Auth</title>
  <style>
    body {
      background: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
      ${success ? 'background: #064e3b; color: #34d399; border: 1px solid #059669;' : 'background: #7f1d1d; color: #f87171; border: 1px solid #dc2626;'}
    }
    h2 { margin: 0 0 12px; font-size: 20px; }
    p { color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 0 0 20px; }
    .btn {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${success ? '✓ Authenticated' : '✕ Auth Failed'}</div>
    <h2>${success ? 'Connected to OpenRouter!' : 'Authentication Error'}</h2>
    <p>${message}</p>
    ${success ? '<p>Syncing with Offline AI Studio and closing this window...</p>' : ''}
    <button class="btn" onclick="window.close()">Close Window</button>
  </div>
  <script>
    const payload = {
      type: '${success ? 'OPENROUTER_AUTH_SUCCESS' : 'OPENROUTER_AUTH_FAILURE'}',
      apiKey: '${apiKey}',
      message: '${message.replace(/'/g, "\\'")}'
    };

    if (window.opener) {
      window.opener.postMessage(payload, '*');
      setTimeout(() => { window.close(); }, 1500);
    } else {
      localStorage.setItem('offlineAi.tempOpenRouterKey', '${apiKey}');
      window.location.href = '/?auth_success=openrouter';
    }
  </script>
</body>
</html>`;
}
