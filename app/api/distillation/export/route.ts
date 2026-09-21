import { NextResponse } from 'next/server';

export async function GET() {
  const shareGptDataset = [
    {
      conversations: [
        { from: 'human', value: 'Create a responsive React component for a real-time analytics card with Tailwind CSS.' },
        { from: 'gpt', value: 'import React from \'react\';\n\nexport default function AnalyticsCard({ title, value, change }: { title: string; value: string; change: string }) {\n  return (\n    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">\n      <h3 className="text-xs font-medium text-slate-500 uppercase">{title}</h3>\n      <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>\n      <div className="text-xs text-emerald-600 font-semibold mt-1">+{change} this week</div>\n    </div>\n  );\n}' }
      ]
    },
    {
      conversations: [
        { from: 'human', value: 'Write an Express middleware to verify JWT authorization headers.' },
        { from: 'gpt', value: 'import { Request, Response, NextFunction } from \'express\';\nimport jwt from \'jsonwebtoken\';\n\nexport function verifyJwt(req: Request, res: Response, next: NextFunction) {\n  const authHeader = req.headers.authorization;\n  if (!authHeader || !authHeader.startsWith(\'Bearer \')) {\n    return res.status(401).json({ error: \'Unauthorized: Missing token\' });\n  }\n  try {\n    const token = authHeader.split(\' \')[1];\n    const decoded = jwt.verify(token, process.env.JWT_SECRET || \'secret\');\n    (req as any).user = decoded;\n    next();\n  } catch (err) {\n    return res.status(403).json({ error: \'Forbidden: Invalid token\' });\n  }\n}' }
      ]
    }
  ];

  const jsonl = shareGptDataset.map(item => JSON.stringify(item)).join('\n');

  return new NextResponse(jsonl, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': 'attachment; filename="sharegpt_training_dataset.jsonl"'
    }
  });
}
