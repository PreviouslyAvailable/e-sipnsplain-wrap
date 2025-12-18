import { Suspense } from 'react';
import JoinPanel from '@/components/JoinPanel';

export default function JoinPage() {
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
