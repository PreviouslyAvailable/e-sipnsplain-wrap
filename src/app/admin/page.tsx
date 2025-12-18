'use client';

import { useState } from 'react';
import StorageBrowser from '@/components/StorageBrowser';

export default function AdminPage() {
  const [roomCode, setRoomCode] = useState('SIP2025');
  const [seedType, setSeedType] = useState<'moments' | 'sample' | 'storage'>('storage');
  const [loading, setLoading] = useState(false);
  const [showStorageBrowser, setShowStorageBrowser] = useState(true);
  const [folder, setFolder] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    photosCreated?: number;
    photosFound?: number;
    errors?: string[];
  } | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);

    try {
      const endpoint = seedType === 'storage' ? '/api/storage/seed' : '/api/seed';
      const body: Record<string, unknown> = {
        roomCode,
        clearExisting: false,
      };

      if (seedType === 'storage') {
        if (folder) body.folder = folder;
      } else {
        body.type = seedType;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Photo Seeding Admin</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="SIP2025"
            />
          </div>

          <div>
            <label htmlFor="seedType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Seed Type
            </label>
            <select
              id="seedType"
              value={seedType}
              onChange={(e) => {
                const newType = e.target.value as 'moments' | 'sample' | 'storage';
                setSeedType(newType);
                setShowStorageBrowser(newType === 'storage');
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="storage">From Supabase Storage</option>
              <option value="moments">From moments.json</option>
              <option value="sample">Sample placeholder photos</option>
            </select>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {seedType === 'storage'
                ? 'Seeds photos from your Supabase Storage bucket (timeline-photos)'
                : seedType === 'moments' 
                ? 'Seeds photos from the moments.json file (12 photos, one per month)'
                : 'Creates sample photos with placeholder images for testing'
              }
            </p>
          </div>

          {seedType === 'storage' && (
            <div>
              <label htmlFor="folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Folder (optional)
              </label>
              <input
                id="folder"
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 2024/january or leave empty for all photos"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Filter photos by folder path. Leave empty to seed all photos from storage.
              </p>
            </div>
          )}

          {seedType === 'storage' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Storage Browser
                </label>
                <button
                  onClick={() => setShowStorageBrowser(!showStorageBrowser)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  {showStorageBrowser ? 'Hide' : 'Show'} Browser
                </button>
              </div>
              {showStorageBrowser && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <StorageBrowser />
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSeed}
            disabled={loading || !roomCode.trim()}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Seeding...' : 'Seed Photos'}
          </button>

          {result && (
            <div className={`p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
              <p className={`font-semibold mb-2 ${
                result.success 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {result.message}
              </p>
              {result.photosCreated !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Photos created: {result.photosCreated}
                  {result.photosFound !== undefined && ` (from ${result.photosFound} found in storage)`}
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Errors:</p>
                  <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>Enter the room code (default: SIP2025)</li>
            <li>Choose seed type:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li><strong>From Supabase Storage:</strong> Pulls photos from your Supabase Storage bucket (recommended)</li>
                <li><strong>From moments.json:</strong> Uses the 12 photos defined in moments.json</li>
                <li><strong>Sample placeholder photos:</strong> Creates 12 placeholder images for testing</li>
              </ul>
            </li>
            <li>Click "Seed Photos" to populate the database</li>
            <li>Photos will appear in the timeline on the host page</li>
          </ol>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            Note: This will add photos to the room. It will not delete existing photos unless you modify the code.
          </p>
        </div>
      </div>
    </div>
  );
}

