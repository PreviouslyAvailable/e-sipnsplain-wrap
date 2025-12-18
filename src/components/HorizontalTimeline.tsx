'use client';

import { useEffect, useState, useRef } from 'react';
import { getTimelinePhotos, subscribeToTimelinePhotos, type Photo } from '@/lib/photos';
import PhotoTile from './PhotoTile';

type HorizontalTimelineProps = {
  selectedPhotoId: string | null;
  onPhotoSelect: (photo: Photo | null) => void;
};

type MonthGroup = {
  month: string;
  year: number;
  photos: Photo[];
  startDate: Date;
};

export default function HorizontalTimeline({ 
  selectedPhotoId, 
  onPhotoSelect 
}: HorizontalTimelineProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group photos by month
  const groupPhotosByMonth = (photos: Photo[]): MonthGroup[] => {
    const groups: Map<string, MonthGroup> = new Map();

    photos.forEach((photo) => {
      const date = photo.taken_at ? new Date(photo.taken_at) : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();

      if (!groups.has(monthKey)) {
        groups.set(monthKey, {
          month: monthName,
          year,
          photos: [],
          startDate: new Date(year, date.getMonth(), 1),
        });
      }

      groups.get(monthKey)!.photos.push(photo);
    });

    return Array.from(groups.values()).sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
  };

  // Load photos
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadPhotos = async () => {
      try {
        setLoading(true);
        const { data, error: photosError } = await getTimelinePhotos();

        if (photosError) {
          throw photosError;
        }

        setPhotos(data || []);
        setError(null);

        // Subscribe to photo updates
        unsubscribe = subscribeToTimelinePhotos((newPhoto) => {
          setPhotos((prev) => {
            const exists = prev.some((p) => p.id === newPhoto.id);
            if (exists) {
              return prev.map((p) => (p.id === newPhoto.id ? newPhoto : p));
            }
            return [...prev, newPhoto].sort((a, b) => {
              const dateA = a.taken_at ? new Date(a.taken_at) : new Date();
              const dateB = b.taken_at ? new Date(b.taken_at) : new Date();
              return dateA.getTime() - dateB.getTime();
            });
          });
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load photos'));
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const monthGroups = groupPhotosByMonth(photos);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No photos yet</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ scrollBehavior: 'smooth', willChange: 'scroll-position' }}
      >
        <div className="inline-flex h-full items-start gap-8 px-8 py-6">
          {monthGroups.map((group, groupIndex) => (
            <div 
              key={`${group.year}-${group.month}`} 
              className={`flex flex-col h-full w-72 flex-shrink-0 ${
                groupIndex < monthGroups.length - 1 ? 'border-r border-gray-300 dark:border-gray-600' : ''
              }`}
            >
              {/* Month divider - sticky header within column */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-2 mb-4">
                <div className="px-4">
                  <div className="flex items-center gap-4 justify-center">
                    <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1 max-w-8" />
                    <div className="flex flex-col items-center whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {group.month}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {group.year}
                      </span>
                    </div>
                    <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1 max-w-8" />
                  </div>
                </div>
              </div>

              {/* Photos grid for this month - 2 columns, vertically scrollable */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-2 gap-x-0 gap-y-1.5 items-start px-4">
                  {group.photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={index % 2 === 1 ? '-ml-4 md:-ml-5' : ''}
                    >
                      <PhotoTile
                        photo={photo}
                        isActive={selectedPhotoId === photo.id}
                        onClick={() => onPhotoSelect(photo)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

