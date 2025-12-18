'use client';

import { useState, useEffect } from 'react';
import { type StorageFile } from '@/lib/storage';

type StorageBrowserProps = {
  onPhotoSelect?: (photos: StorageFile[]) => void;
  multiSelect?: boolean;
};

type StorageListResponse = {
  success: boolean;
  files: Array<StorageFile & { date: string | null; month: string | null; year: number | null; caption: string | null }>;
  count: number;
  groupedByMonth: Record<string, StorageFile[]>;
};

export default function StorageBrowser({ onPhotoSelect, multiSelect = false }: StorageBrowserProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<StorageListResponse['files']>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [folder, setFolder] = useState('');
  const [groupedByMonth, setGroupedByMonth] = useState<Record<string, StorageFile[]>>({});

  const loadPhotos = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        bucket: 'timeline-photos',
        recursive: 'true',
      });
      if (folder) {
        params.append('folder', folder);
      }

      const response = await fetch(`/api/storage/list?${params.toString()}`);
      const data: StorageListResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to load photos');
      }

      setPhotos(data.files);
      setGroupedByMonth(data.groupedByMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos from storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [folder]);

  const handlePhotoToggle = (photoPath: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoPath)) {
      newSelected.delete(photoPath);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(photoPath);
    }
    setSelectedPhotos(newSelected);

    if (onPhotoSelect) {
      const selected = photos.filter(p => newSelected.has(p.path));
      onPhotoSelect(selected);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Loading photos from storage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error</p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          <button
            onClick={loadPhotos}
            className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="Filter by folder (optional)"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={loadPhotos}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        Found {photos.length} photos in storage
      </div>

      {photos.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No photos found in storage</p>
          <p className="text-xs mt-2">Make sure your Supabase Storage bucket "timeline-photos" exists and contains images</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
          {photos.map((photo) => {
            const isSelected = selectedPhotos.has(photo.path);
            return (
              <button
                key={photo.path}
                onClick={() => handlePhotoToggle(photo.path)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                <img
                  src={photo.publicUrl}
                  alt={photo.caption || photo.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs">Failed to load</div>';
                    }
                  }}
                />
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                  {photo.caption || photo.name}
                </div>
                {photo.date && (
                  <div className="absolute top-0 left-0 p-1 bg-black/60 text-white text-xs">
                    {new Date(photo.date).toLocaleDateString()}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedPhotos.size > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

