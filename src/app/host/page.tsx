'use client';

import HostPanel from '@/components/HostPanel';

export default function HostPage() {
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--black)' }}>Host Controls</h1>
          <p style={{ color: 'var(--untitled-ui-gray700)' }}>
            Select and open questions for the room. View the presentation at <span className="font-mono text-sm">/present</span>
          </p>
        </header>

        <div className="rounded-lg shadow-lg" style={{ backgroundColor: 'var(--untitled-ui-white)', border: '1px solid var(--untitled-ui-gray200)' }}>
          <HostPanel />
        </div>
      </div>
    </div>
  );
}
