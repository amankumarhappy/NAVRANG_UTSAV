import { createClient } from "@supabase/supabase-js";
import { eventConfig, type PublicEvent } from "@/config/event";

export async function getActiveEvent(): Promise<PublicEvent | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !eventConfig.id) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("get_active_event", {
    p_event_id: eventConfig.id,
  });
  if (error) {
    console.error("Unable to fetch the active event", error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as PublicEvent | null;
  if (!row?.id || !row.is_active) return null;
  return row;
}
