'use client';

import { type Photo } from '@/lib/photos';
import { getPhotoPublicUrl } from '@/lib/storage';

type PhotoTileProps = {
  photo: Photo;
  isActive?: boolean;
  onClick?: () => void;
};

function getPhotoUrl(photo: Photo): string {
  // Always use Supabase client to generate URL from storage_path
  // This ensures we use the correct project ref from environment variables
  // The database public_url may have incorrect project ref, so we regenerate it
  return getPhotoPublicUrl('timeline-photos', photo.storage_path);
}

export default function PhotoTile({ photo, isActive = false, onClick }: PhotoTileProps) {
  const imageUrl = getPhotoUrl(photo);
  
  // Generate a consistent rotation based on photo ID for sticker effect
  const getRotation = (id: string): number => {
    // Use a simple hash of the ID to get a consistent rotation between -3 and 3 degrees
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return (hash % 7) - 3; // Range from -3 to 3 degrees
  };
  
  const rotation = isActive ? 0 : getRotation(photo.id);

  return (
    <button
      onClick={onClick}
      className={`
        relative group
        w-16 h-16 md:w-20 md:h-20
        rounded-md overflow-hidden
        transition-all duration-200
        shadow-sm
        flex-shrink-0
        ${isActive 
          ? 'ring-2 ring-blue-500 shadow-md scale-110 z-10' 
          : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-gray-300 hover:shadow-md hover:scale-105'
        }
      `}
      style={{
        transform: isActive 
          ? 'scale(1.1) rotate(0deg)' 
          : `rotate(${rotation}deg)`,
        transformOrigin: 'center',
      }}
      aria-label={photo.caption || 'Photo'}
    >
      <img
        src={imageUrl}
        alt={photo.caption || 'Timeline photo'}
        className="w-full h-full object-cover"
        loading="lazy"
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
        }}
      />
      {isActive && (
        <div className="absolute inset-0 bg-blue-500/20 pointer-events-none" />
      )}
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {photo.caption}
        </div>
      )}
    </button>
  );
}

