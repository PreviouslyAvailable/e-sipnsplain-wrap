'use client';

import { Suspense, useState, useEffect } from 'react';
import JoinPanel from '@/components/JoinPanel';

export default function JoinPage() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500); // 3.5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--black)', zIndex: 9999 }}>
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            Sip&apos;n&apos;Sleigh
          </h1>
          <div className="text-6xl md:text-7xl lg:text-8xl">
            🎅
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--cream)' }}>
      <header className="p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--black)' }}>Sip&apos;n&apos;Sleigh &apos;25</h1>
      </header>
      <div className="flex-1">
        <Suspense fallback={<div className="p-6 md:p-8">Loading...</div>}>
          <JoinPanel />
        </Suspense>
      </div>
    </div>
  );
}
