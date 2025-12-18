import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name } = body;

    // Generate a unique room code (6 characters, uppercase)
    let roomCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      roomCode = nanoid(6).toUpperCase();
      attempts++;

      // Check if code already exists
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', roomCode)
        .single();

      if (!existing) {
        break;
      }

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: 'Failed to generate unique room code' },
          { status: 500 }
        );
      }
    } while (true);

    // Create the room
    const { data: room, error } = await supabase
      .from('rooms')
      .insert([
        {
          code: roomCode,
          name: name || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      return NextResponse.json(
        { error: 'Failed to create room', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: room }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

