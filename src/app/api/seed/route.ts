import { NextResponse } from 'next/server';
import { seedPhotosFromMoments, seedSamplePhotos, seedPhotosFromStorage } from '@/lib/seedPhotos';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomCode, type = 'moments', clearExisting = false, count = 12, folder, bucketName } = body;

    if (!roomCode) {
      return NextResponse.json(
        { error: 'roomCode is required' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'moments') {
      result = await seedPhotosFromMoments(roomCode, {
        clearExisting,
      });
    } else if (type === 'sample') {
      result = await seedSamplePhotos(roomCode, count);
    } else if (type === 'storage') {
      result = await seedPhotosFromStorage(roomCode, {
        folder,
        clearExisting,
        bucketName,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use "moments", "sample", or "storage"' },
        { status: 400 }
      );
    }

    const photosFound = 'photosFound' in result ? result.photosFound : undefined;

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: photosFound !== undefined 
          ? `Successfully created ${result.photosCreated} photos from ${photosFound} found in storage`
          : `Successfully created ${result.photosCreated} photos`,
        photosCreated: result.photosCreated,
        photosFound,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: photosFound !== undefined
            ? `Created ${result.photosCreated} photos from ${photosFound} found, with ${result.errors.length} errors`
            : `Created ${result.photosCreated} photos with ${result.errors.length} errors`,
          photosCreated: result.photosCreated,
          photosFound,
          errors: result.errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error seeding photos:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

