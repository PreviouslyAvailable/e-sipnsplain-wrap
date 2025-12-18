import { supabase } from "@/lib/supabaseClient";

export type TimelineMoment = {
  id: string;
  room_id: string;
  date: string;
  photo_url: string;
  caption: string | null;
  question_id: string | null;
  order_index: number;
  created_at: string;
};

export type TimelinePosition = {
  month: string | null;
  scrollPosition: number;
  activeMomentId: string | null;
};

export async function getTimelineMoments(roomId: string) {
  return supabase
    .from("timeline_moments")
    .select("id, room_id, date, photo_url, caption, question_id, order_index, created_at")
    .eq("room_id", roomId)
    .order("date", { ascending: true });
}

export async function updateTimelinePosition(
  roomId: string,
  position: TimelinePosition
) {
  return supabase
    .from("rooms")
    .update({ timeline_position: position })
    .eq("id", roomId);
}

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

export function getMonthFromDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'long' });
}

export function groupMomentsByMonth(moments: TimelineMoment[]): Map<string, TimelineMoment[]> {
  const grouped = new Map<string, TimelineMoment[]>();
  
  moments.forEach((moment) => {
    const month = getMonthFromDate(moment.date);
    if (!grouped.has(month)) {
      grouped.set(month, []);
    }
    grouped.get(month)!.push(moment);
  });
  
  return grouped;
}

