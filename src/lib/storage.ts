import { supabase } from '@/lib/supabaseClient';

export type StorageFile = {
  name: string;
  path: string;
  size: number;
  created_at: string;
  updated_at: string;
  publicUrl: string;
  id?: string;
};

const DEFAULT_BUCKET = 'timeline-photos';

/**
 * Lists all files in a Supabase Storage bucket
 */
export async function listPhotosFromStorage(
  bucketName: string = DEFAULT_BUCKET,
  folder?: string
): Promise<{ data: StorageFile[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder || '', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (error) {
      return { data: null, error: new Error(`Storage error: ${error.message}`) };
    }

    if (!data) {
      return { data: [], error: null };
    }

    // Filter for image files and build full file list
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.SVG'];
    const files: StorageFile[] = [];


    for (const item of data) {
      // Skip folders
      if (!item.id) {
        continue;
      }

      const filePath = folder ? `${folder}/${item.name}` : item.name;
      const isImage = imageExtensions.some(ext => 
        item.name.toLowerCase().endsWith(ext.toLowerCase())
      );
      
      if (!isImage) {
      }

      if (isImage) {
        const publicUrl = getPhotoPublicUrl(bucketName, filePath);
        files.push({
          name: item.name,
          path: filePath,
          size: (item.metadata as { size?: number })?.size || 0,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          publicUrl,
          id: item.id,
        });
      }
    }

    return { data: files, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error listing storage files'),
    };
  }
}

/**
 * Gets the public URL for a photo in storage
 * Uses Supabase client to get the public URL, which handles edge cases better
 */
export function getPhotoPublicUrl(bucketName: string, filePath: string): string {
  // Remove leading slash from filePath if present
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  // Use Supabase client to get public URL (handles URL encoding and edge cases)
  const { data } = supabase.storage.from(bucketName).getPublicUrl(cleanPath);
  
  if (data?.publicUrl) {
    return data.publicUrl;
  }
  
  // Fallback: construct URL manually if client method fails
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl) {
    return filePath;
  }

  // Extract project ref from Supabase URL
  const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    return filePath;
  }

  const projectRef = urlMatch[1];
  
  return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${cleanPath}`;
}

/**
 * Gets metadata for a specific file in storage
 */
export async function getStorageFileMetadata(
  bucketName: string = DEFAULT_BUCKET,
  filePath: string
): Promise<{ data: StorageFile | null; error: Error | null }> {
  try {
    // Extract folder and filename
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';

    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      return { data: null, error: new Error(`Storage error: ${error.message}`) };
    }

    const file = data?.find(item => item.name === fileName);
    if (!file || !file.id) {
      return { data: null, error: new Error('File not found') };
    }

    const publicUrl = getPhotoPublicUrl(bucketName, filePath);
    const storageFile: StorageFile = {
      name: file.name,
      path: filePath,
      size: (file.metadata as { size?: number })?.size || 0,
      created_at: file.created_at || new Date().toISOString(),
      updated_at: file.updated_at || new Date().toISOString(),
      publicUrl,
      id: file.id,
    };

    return { data: storageFile, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error getting file metadata'),
    };
  }
}

/**
 * Recursively lists all files in storage (including subfolders)
 */
export async function listAllPhotosRecursive(
  bucketName: string = DEFAULT_BUCKET,
  folder: string = ''
): Promise<{ data: StorageFile[] | null; error: Error | null }> {
  try {
    const allFiles: StorageFile[] = [];
    
    async function listRecursive(currentFolder: string) {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(currentFolder, {
          limit: 1000,
          offset: 0,
        });

      if (error) {
        console.error('Storage list error:', {
          bucket: bucketName,
          folder: currentFolder,
          error: error.message,
        });
        throw error;
      }

      if (!data) {
        console.warn('No data returned from storage list:', { bucket: bucketName, folder: currentFolder });
        return;
      }


      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.JPG', '.JPEG', '.PNG'];

      for (const item of data) {
        const itemPath = currentFolder ? `${currentFolder}/${item.name}` : item.name;

        // If it's a folder (no id), recurse into it
        if (!item.id) {
          await listRecursive(itemPath);
        } else {
          // It's a file - check if it's an image
          const isImage = imageExtensions.some(ext => 
            item.name.toLowerCase().endsWith(ext.toLowerCase())
          );

          if (isImage) {
            const publicUrl = getPhotoPublicUrl(bucketName, itemPath);
            allFiles.push({
              name: item.name,
              path: itemPath,
              size: (item.metadata as { size?: number })?.size || 0,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || new Date().toISOString(),
              publicUrl,
              id: item.id,
            });
          }
        }
      }
    }

    await listRecursive(folder);
    return { data: allFiles, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in listAllPhotosRecursive:', errorMessage);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(`Error listing files recursively: ${errorMessage}`),
    };
  }
}

