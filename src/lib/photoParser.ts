import { type StorageFile } from './storage';

export type ParsedPhoto = {
  file: StorageFile;
  date: Date | null;
  month: string | null;
  year: number | null;
  caption: string | null;
};

/**
 * Parses a photo path to extract date information
 */
export function parsePhotoPath(filePath: string): {
  date: Date | null;
  month: string | null;
  year: number | null;
} {
  let date: Date | null = null;
  let month: string | null = null;
  let year: number | null = null;

  // Try to extract date from folder structure: 2024/01/photo.jpg or 2024/january/photo.jpg
  const pathParts = filePath.split('/');
  
  // Check for year in path (4-digit number)
  for (const part of pathParts) {
    const yearMatch = part.match(/^(\d{4})$/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
      
      // Check if next part is a month
      const partIndex = pathParts.indexOf(part);
      if (partIndex < pathParts.length - 1) {
        const nextPart = pathParts[partIndex + 1];
        const monthNum = parseInt(nextPart, 10);
        if (monthNum >= 1 && monthNum <= 12) {
          date = new Date(year, monthNum - 1, 15); // Use 15th as default day
          month = date.toLocaleString('default', { month: 'long' });
          break;
        }
        
        // Check for month name
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const monthIndex = monthNames.indexOf(nextPart.toLowerCase());
        if (monthIndex !== -1) {
          date = new Date(year, monthIndex, 15);
          month = date.toLocaleString('default', { month: 'long' });
          break;
        }
      }
    }
  }

  // Try to extract date from filename: YYYY-MM-DD_filename.jpg or YYYYMMDD_filename.jpg
  const fileName = pathParts[pathParts.length - 1];
  
  // Pattern: YYYY-MM-DD
  const datePattern1 = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (datePattern1 && !date) {
    const [, y, m, d] = datePattern1;
    date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    month = date.toLocaleString('default', { month: 'long' });
    year = date.getFullYear();
  }

  // Pattern: YYYYMMDD
  const datePattern2 = fileName.match(/(\d{4})(\d{2})(\d{2})/);
  if (datePattern2 && !date) {
    const [, y, m, d] = datePattern2;
    date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    month = date.toLocaleString('default', { month: 'long' });
    year = date.getFullYear();
  }

  // Pattern: MM-DD-YYYY
  const datePattern3 = fileName.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (datePattern3 && !date) {
    const [, m, d, y] = datePattern3;
    date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    month = date.toLocaleString('default', { month: 'long' });
    year = date.getFullYear();
  }

  // If we have a date but no month/year, extract them
  if (date && !month) {
    month = date.toLocaleString('default', { month: 'long' });
  }
  if (date && !year) {
    year = date.getFullYear();
  }

  return { date, month, year };
}

/**
 * Extracts a caption from a filename
 */
export function extractCaptionFromFilename(filename: string): string | null {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Remove date patterns
  let caption = nameWithoutExt
    .replace(/\d{4}-\d{2}-\d{2}[_-]?/g, '') // YYYY-MM-DD
    .replace(/\d{4}\d{2}\d{2}[_-]?/g, '') // YYYYMMDD
    .replace(/\d{2}-\d{2}-\d{4}[_-]?/g, '') // MM-DD-YYYY
    .replace(/^\d+[_-]?/g, '') // Leading numbers
    .trim();

  // Convert kebab-case, snake_case, or camelCase to Title Case
  if (caption) {
    caption = caption
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return caption || null;
}

/**
 * Groups photos by month
 */
export function groupPhotosByMonth(photos: ParsedPhoto[]): Map<string, ParsedPhoto[]> {
  const grouped = new Map<string, ParsedPhoto[]>();

  photos.forEach((photo) => {
    // Use month-year as key, or "Unknown" if no date
    const key = photo.month && photo.year 
      ? `${photo.month} ${photo.year}`
      : 'Unknown';

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(photo);
  });

  return grouped;
}

/**
 * Parses a storage file into a ParsedPhoto
 */
export function parsePhoto(file: StorageFile): ParsedPhoto {
  const { date, month, year } = parsePhotoPath(file.path);
  const caption = extractCaptionFromFilename(file.name);

  return {
    file,
    date: date || new Date(file.created_at), // Fallback to file creation date
    month: month || new Date(file.created_at).toLocaleString('default', { month: 'long' }),
    year: year || new Date(file.created_at).getFullYear(),
    caption,
  };
}

/**
 * Sorts photos by date (earliest first)
 */
export function sortPhotosByDate(photos: ParsedPhoto[]): ParsedPhoto[] {
  return [...photos].sort((a, b) => {
    const dateA = a.date?.getTime() || 0;
    const dateB = b.date?.getTime() || 0;
    return dateA - dateB;
  });
}

