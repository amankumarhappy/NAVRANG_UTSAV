import { createClient } from "@supabase/supabase-js";
import { eventConfig, type PublicEvent } from "@/config/event";
import { getSupabasePublicConfig, SupabaseConfigurationError } from "@/lib/supabase/config";

export type ActiveEventStatus = "ready" | "closed" | "not-found" | "unconfigured" | "invalid-event-id" | "network-error" | "rpc-error";
export type ActiveEventReason = "configuration" | "invalid-event-id" | "network" | "rpc" | null;
export type ActiveEventResult = { event: PublicEvent | null; status: ActiveEventStatus; reason: ActiveEventReason };

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isNetworkFailure = (message: string) => /fetch failed|network|enotfound|econnrefused|etimedout/i.test(message);

function logActiveEventFailure(reason: Exclude<ActiveEventReason, null>, eventId: string, detail?: string) {
  const message = `Active event unavailable; serving configured public event details. reason=${reason} eventId=${eventId || "not-configured"}${detail ? ` detail=${detail}` : ""}`;
  if (reason === "network") {
    // The homepage has a configuration fallback, so a transient external outage is not a server exception.
    console.warn(message);
    return;
  }
  console.error(message);
}

export async function getActiveEventResult(): Promise<ActiveEventResult> {
  if (!eventConfig.id) return { event: null, status: "unconfigured", reason: "configuration" };
  if (!isUuid(eventConfig.id)) {
    logActiveEventFailure("invalid-event-id", eventConfig.id);
    return { event: null, status: "invalid-event-id", reason: "invalid-event-id" };
  }

  try {
    const { url, key } = getSupabasePublicConfig();
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("get_active_event", {
      p_event_id: eventConfig.id,
    });
    if (error) {
      if (isNetworkFailure(error.message)) {
        logActiveEventFailure("network", eventConfig.id, error.message);
        return { event: null, status: "network-error", reason: "network" };
      }
      logActiveEventFailure("rpc", eventConfig.id, error.message);
      return { event: null, status: "rpc-error", reason: "rpc" };
    }
    const row = (Array.isArray(data) ? data[0] : data) as PublicEvent | null;
    if (!row?.id) return { event: null, status: "not-found", reason: null };
    if (!row.is_active) return { event: row, status: "closed", reason: null };
    return { event: row, status: "ready", reason: null };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      logActiveEventFailure("configuration", eventConfig.id, error.code);
      return { event: null, status: "unconfigured", reason: "configuration" };
    }
    const detail = error instanceof Error ? error.message : "unknown error";
    logActiveEventFailure("network", eventConfig.id, detail);
    return { event: null, status: "network-error", reason: "network" };
  }
}

export async function getActiveEvent(): Promise<PublicEvent | null> {
  const result = await getActiveEventResult();
  return result.status === "ready" ? result.event : null;
}
