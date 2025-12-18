import { supabase } from "@/lib/supabaseClient";

export type Photo = {
  id: string;
  storage_path: string;
  public_url: string;
  taken_at: string | null;
  caption: string | null;
  location: string | null;
};

export async function getTimelinePhotos() {
  return supabase
    .from("timeline_photos")
    .select("id, storage_path, public_url, taken_at, caption, location")
    .order("taken_at", { ascending: true });
}

export async function getPhotoById(photoId: string) {
  return supabase
    .from("timeline_photos")
    .select("id, storage_path, public_url, taken_at, caption, location")
    .eq("id", photoId)
    .single();
}

export function subscribeToTimelinePhotos(callback: (photo: Photo) => void) {
  const channel = supabase
    .channel(`timeline_photos`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "timeline_photos",
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          callback(payload.new as Photo);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

