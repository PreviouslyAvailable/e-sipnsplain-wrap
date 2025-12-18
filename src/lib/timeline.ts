/**
 * Utility functions for timeline photo URLs
 * Note: This file is kept for backward compatibility with seedPhotos.ts
 * New code should use getPhotoPublicUrl from @/lib/storage
 */

export function getPhotoUrl(photoPath: string): string {
  // If it's already a full URL, return as-is
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl) return photoPath;
  
  // Extract project ref from Supabase URL
  const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) return photoPath;
  
  const projectRef = urlMatch[1];
  
  // Remove leading slash and "timeline-photos/" prefix if already present
  let cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
  if (cleanPath.startsWith('timeline-photos/')) {
    cleanPath = cleanPath.replace('timeline-photos/', '');
  }
  
  return `https://${projectRef}.supabase.co/storage/v1/object/public/timeline-photos/${cleanPath}`;
}

