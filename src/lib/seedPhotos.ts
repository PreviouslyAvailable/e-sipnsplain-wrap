import { getRoomByCode } from '@/lib/quiz';
import { supabase } from '@/lib/supabaseClient';
import { getPhotoUrl } from '@/lib/timeline';
import { listAllPhotosRecursive, getPhotoPublicUrl } from '@/lib/storage';
import { parsePhoto, sortPhotosByDate } from '@/lib/photoParser';
import momentsData from '@/data/moments.json';

type MomentData = {
  id: string;
  date: string;
  photo_url: string;
  caption: string;
  month: string;
  question_id: string | null;
};

/**
 * Seeds photos from moments.json into the database for a given room
 */
export async function seedPhotosFromMoments(
  roomCode: string,
  options?: {
    clearExisting?: boolean;
  }
): Promise<{ success: boolean; photosCreated: number; errors: string[] }> {
  const errors: string[] = [];
  let photosCreated = 0;

  try {
    // Get the room
    const { data: room, error: roomError } = await getRoomByCode(roomCode);
    
    if (roomError || !room) {
      return {
        success: false,
        photosCreated: 0,
        errors: [`Failed to find room with code: ${roomCode}. ${roomError?.message || ''}`],
      };
    }

    // Clear existing photos if requested
    if (options?.clearExisting) {
      // Note: This would require a deletePhotos function
      // For now, we'll skip this and just add photos
      console.log('Note: clearExisting is not yet implemented');
    }

    // Convert moments.json data to photos
    const moments = momentsData as MomentData[];
    
    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i];
      
      try {
        // Use the existing getPhotoUrl helper which handles Supabase Storage URLs
        const photoUrl = getPhotoUrl(moment.photo_url);
        
        const { error: createError } = await supabase
          .from('timeline_photos')
          .insert({
            storage_path: moment.photo_url,
            public_url: photoUrl,
            taken_at: moment.date,
            caption: moment.caption || null,
          });

        if (createError) {
          errors.push(`Failed to create photo for ${moment.id}: ${createError.message}`);
        } else {
          photosCreated++;
        }
      } catch (err) {
        errors.push(`Error processing moment ${moment.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      photosCreated,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      photosCreated,
      errors: [`Fatal error: ${err instanceof Error ? err.message : 'Unknown error'}`],
    };
  }
}

/**
 * Seeds photos from Supabase Storage into the timeline_photos table
 */
export async function seedPhotosFromStorage(
  roomCode: string,
  options?: {
    folder?: string;
    clearExisting?: boolean;
    bucketName?: string;
  }
): Promise<{ 
  success: boolean; 
  photosCreated: number; 
  photosFound: number;
  errors: string[] 
}> {
  const errors: string[] = [];
  let photosCreated = 0;
  let photosFound = 0;

  try {
    // Get the room
    const { data: room, error: roomError } = await getRoomByCode(roomCode);
    
    if (roomError || !room) {
      return {
        success: false,
        photosCreated: 0,
        photosFound: 0,
        errors: [`Failed to find room with code: ${roomCode}. ${roomError?.message || ''}`],
      };
    }

    // List photos from storage
    const bucketName = options?.bucketName || 'timeline-photos';
    const { data: storageFiles, error: storageError } = await listAllPhotosRecursive(
      bucketName,
      options?.folder || ''
    );

    if (storageError) {
      return {
        success: false,
        photosCreated: 0,
        photosFound: 0,
        errors: [`Failed to list photos from storage: ${storageError.message}`],
      };
    }

    if (!storageFiles || storageFiles.length === 0) {
      return {
        success: true,
        photosCreated: 0,
        photosFound: 0,
        errors: ['No photos found in storage'],
      };
    }

    photosFound = storageFiles.length;

    // Parse photos to extract dates and metadata
    const parsedPhotos = storageFiles.map(parsePhoto);
    const sortedPhotos = sortPhotosByDate(parsedPhotos);

    // Clear existing photos if requested
    if (options?.clearExisting) {
      // Note: This would require a deletePhotos function
      // For now, we'll skip this and just add photos
      console.log('Note: clearExisting is not yet implemented');
    }

    // Create photo records in database
    for (let i = 0; i < sortedPhotos.length; i++) {
      const parsedPhoto = sortedPhotos[i];
      
      try {
        // Use the public URL from storage
        const photoUrl = parsedPhoto.file.publicUrl;
        
        const { error: createError } = await supabase
          .from('timeline_photos')
          .insert({
            storage_path: parsedPhoto.file.path,
            public_url: photoUrl,
            taken_at: parsedPhoto.date?.toISOString() || parsedPhoto.file.created_at,
            caption: parsedPhoto.caption,
          });

        if (createError) {
          errors.push(`Failed to create photo for ${parsedPhoto.file.name}: ${createError.message}`);
        } else {
          photosCreated++;
        }
      } catch (err) {
        errors.push(`Error processing photo ${parsedPhoto.file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      photosCreated,
      photosFound,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      photosCreated,
      photosFound,
      errors: [`Fatal error: ${err instanceof Error ? err.message : 'Unknown error'}`],
    };
  }
}

/**
 * Seeds photos with sample placeholder images for testing
 */
export async function seedSamplePhotos(
  roomCode: string,
  count: number = 12
): Promise<{ success: boolean; photosCreated: number; errors: string[] }> {
  const errors: string[] = [];
  let photosCreated = 0;

  try {
    const { data: room, error: roomError } = await getRoomByCode(roomCode);
    
    if (roomError || !room) {
      return {
        success: false,
        photosCreated: 0,
        errors: [`Failed to find room with code: ${roomCode}`],
      };
    }

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = new Date().getFullYear();

    for (let i = 0; i < Math.min(count, 12); i++) {
      const month = months[i];
      const date = new Date(currentYear, i, 15); // 15th of each month
      
      try {
        const { error: createError } = await supabase
          .from('timeline_photos')
          .insert({
            storage_path: `sample-${roomCode}-${i}.jpg`,
            public_url: `https://picsum.photos/seed/${roomCode}-${i}/800/600`,
            taken_at: date.toISOString(),
            caption: `Sample photo from ${month}`,
          });

        if (createError) {
          errors.push(`Failed to create sample photo for ${month}: ${createError.message}`);
        } else {
          photosCreated++;
        }
      } catch (err) {
        errors.push(`Error creating sample photo for ${month}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      photosCreated,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      photosCreated,
      errors: [`Fatal error: ${err instanceof Error ? err.message : 'Unknown error'}`],
    };
  }
}
