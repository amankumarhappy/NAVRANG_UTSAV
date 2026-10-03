import { createClient } from "@supabase/supabase-js";
import { eventConfig, type PublicEvent } from "@/config/event";

export type ActiveEventStatus = "ready" | "closed" | "not-found" | "unconfigured" | "unavailable";

export async function getActiveEventResult(): Promise<{ event: PublicEvent | null; status: ActiveEventStatus }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !eventConfig.id) return { event: null, status: "unconfigured" };

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("get_active_event", {
      p_event_id: eventConfig.id,
    });
    if (error) {
      console.error("Unable to fetch the active event", error.message);
      return { event: null, status: "unavailable" };
    }
    const row = (Array.isArray(data) ? data[0] : data) as PublicEvent | null;
    if (!row?.id) return { event: null, status: "not-found" };
    if (!row.is_active) return { event: row, status: "closed" };
    return { event: row, status: "ready" };
  } catch (error) {
    console.error("Unable to fetch the active event", error);
    return { event: null, status: "unavailable" };
  }
}

export async function getActiveEvent(): Promise<PublicEvent | null> {
  const result = await getActiveEventResult();
  return result.status === "ready" ? result.event : null;
}
