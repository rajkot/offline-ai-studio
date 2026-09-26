import { NextRequest, NextResponse } from 'next/server';
import { sonnerNotificationEngine } from '@/lib/ui/sonnerNotificationEngine';

export async function GET() {
  try {
    const activeToasts = sonnerNotificationEngine.getToasts();

    return NextResponse.json({
      status: 'online',
      studio: 'Magic UI & Sonner Luxury Aesthetics Studio',
      effects: [
        {
          name: 'Border Beam',
          description: 'Smooth traveling light gradient along card borders during active AI inference',
          cssUtility: 'border-beam animate-border-beam'
        },
        {
          name: 'Shimmer Button',
          description: 'Linear-inspired metallic gleam sweep across primary action buttons',
          cssUtility: 'shimmer-button'
        },
        {
          name: 'Sonner Stacked Toasts',
          description: 'Fluid spring-animated toast notifications docked in bottom-right corner',
          activeToastsCount: activeToasts.length
        },
        {
          name: 'Spotlight Hover Card',
          description: 'Cursor-following radial gradient glow for cards and tool palettes',
          cssUtility: 'spotlight-card'
        }
      ],
      colorThemes: [
        { id: 'indigo', name: 'Cosmic Indigo', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
        { id: 'cyan', name: 'Neon Cyan', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
        { id: 'emerald', name: 'Emerald Sovereignty', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
        { id: 'pink', name: 'Lyric Rose', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
        { id: 'amber', name: 'Solar Amber', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, title = 'Magic UI Notification', description = '', type = 'ai' } = body;

    if (action === 'triggerToast') {
      const id = sonnerNotificationEngine.show({
        title,
        description,
        type: type as any
      });
      return NextResponse.json({
        success: true,
        toastId: id,
        activeCount: sonnerNotificationEngine.getToasts().length
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
