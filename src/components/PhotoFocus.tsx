'use client';

import { type Photo } from '@/lib/photos';
import { getPhotoPublicUrl } from '@/lib/storage';

type PhotoFocusProps = {
  photo: Photo | null;
};

function getPhotoUrl(photo: Photo): string {
  // Always use Supabase client to generate URL from storage_path
  // This ensures we use the correct project ref from environment variables
  // The database public_url may have incorrect project ref, so we regenerate it
  return getPhotoPublicUrl('timeline-photos', photo.storage_path);
}

export default function PhotoFocus({ photo }: PhotoFocusProps) {
  if (!photo) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-400 dark:text-gray-600">Select a photo to view</p>
      </div>
    );
  }

  const imageUrl = getPhotoUrl(photo);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 px-6 pr-12 py-12">
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={imageUrl}
          alt={photo.caption || 'Photo'}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          loading="eager"
          decoding="async"
          onError={(e) => {
            // Gracefully handle image load errors
            const target = e.target as HTMLImageElement;
            console.error('Failed to load image:', {
              url: imageUrl,
              storage_path: photo.storage_path,
              public_url: photo.public_url,
            });
            target.style.display = 'none';
            const container = target.parentElement;
            if (container) {
              container.innerHTML = `<div class="text-red-500 p-4">
                <p>Failed to load image</p>
                <p class="text-xs text-gray-400 mt-2">URL: ${imageUrl}</p>
                <p class="text-xs text-gray-400">Storage path: ${photo.storage_path}</p>
                <p class="text-xs text-gray-500 mt-2">Check that the bucket is public and the file exists.</p>
              </div>`;
            }
          }}
        />
      </div>
      {photo.caption && (
        <div className="mt-4 text-center">
          <p className="text-lg text-gray-700 dark:text-gray-300">{photo.caption}</p>
        </div>
      )}
      {photo.location && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{photo.location}</p>
        </div>
      )}
    </div>
  );
}

