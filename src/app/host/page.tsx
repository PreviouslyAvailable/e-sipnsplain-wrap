'use client';

import HostPanel from '@/components/HostPanel';

export default function HostPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Host Controls</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select and open questions for the room. View the presentation at <span className="font-mono text-sm">/present</span>
          </p>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <HostPanel />
        </div>
      </div>
    </div>
  );
}
