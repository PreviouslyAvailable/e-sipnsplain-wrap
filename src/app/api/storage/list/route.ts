import { NextResponse } from 'next/server';
import { listAllPhotosRecursive, listPhotosFromStorage } from '@/lib/storage';
import { parsePhoto, sortPhotosByDate, groupPhotosByMonth } from '@/lib/photoParser';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket') || 'timeline-photos';
    const folder = searchParams.get('folder') || '';
    const recursive = searchParams.get('recursive') === 'true';


    let result;

    if (recursive) {
      result = await listAllPhotosRecursive(bucket, folder);
    } else {
      result = await listPhotosFromStorage(bucket, folder);
    }

    if (result.error) {
      console.error('Storage list error:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }


    // Parse photos to include metadata
    const parsedPhotos = (result.data || []).map(parsePhoto);
    const sortedPhotos = sortPhotosByDate(parsedPhotos);
    const groupedByMonth = groupPhotosByMonth(parsedPhotos);

    return NextResponse.json({
      success: true,
      files: sortedPhotos.map(p => ({
        ...p.file,
        date: p.date?.toISOString() || null,
        month: p.month,
        year: p.year,
        caption: p.caption,
      })),
      count: sortedPhotos.length,
      groupedByMonth: Object.fromEntries(
        Array.from(groupedByMonth.entries()).map(([month, photos]) => [
          month,
          photos.map(p => ({
            ...p.file,
            date: p.date?.toISOString() || null,
            month: p.month,
            year: p.year,
            caption: p.caption,
          })),
        ])
      ),
    });
  } catch (error) {
    console.error('Error listing storage photos:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

