import { NextResponse } from 'next/server';
import { seedPhotosFromStorage } from '@/lib/seedPhotos';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomCode, folder, clearExisting = false, bucketName = 'timeline-photos' } = body;

    if (!roomCode) {
      return NextResponse.json(
        { error: 'roomCode is required' },
        { status: 400 }
      );
    }

    const result = await seedPhotosFromStorage(roomCode, {
      folder,
      clearExisting,
      bucketName,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully created ${result.photosCreated} photos from ${result.photosFound} found in storage`,
        photosCreated: result.photosCreated,
        photosFound: result.photosFound,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `Created ${result.photosCreated} photos from ${result.photosFound} found, with ${result.errors.length} errors`,
          photosCreated: result.photosCreated,
          photosFound: result.photosFound,
          errors: result.errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error seeding photos from storage:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

