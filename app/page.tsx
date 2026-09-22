'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { UserRole } from '@/components/Playground';
import { ThemeProvider } from '@/components/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE } from '@/lib/languages';

const Playground = dynamic(() => import('@/components/Playground'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#09090b] text-zinc-400 font-mono text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        <span>Initializing Workspace Environment...</span>
      </div>
    </div>
  )
});

export default function HomePage() {
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored) {
          setLanguage(stored);
        }
      } catch {}
    }
  }, []);

  return (
    <ThemeProvider>
      <main className="h-screen w-screen bg-[#09090b] text-[#f4f4f5] flex flex-col overflow-hidden" suppressHydrationWarning>
        <ErrorBoundary fallbackTitle="Workspace Initialization Notice">
          <Playground 
            userRole={userRole} 
            setUserRole={setUserRole}
            language={language}
            setLanguage={setLanguage}
          />
        </ErrorBoundary>
      </main>
    </ThemeProvider>
  );
}


