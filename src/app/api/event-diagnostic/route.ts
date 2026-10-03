import { NextResponse } from "next/server";
import { eventConfig } from "@/config/event";
import { getSupabaseConfigurationDiagnostic } from "@/lib/supabase/config";
import { getActiveEventResult } from "@/lib/supabase/event";

/** Development-only, secret-free support endpoint for validating event setup. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

  const result = await getActiveEventResult();
  return NextResponse.json({
    supabase: {
      ...getSupabaseConfigurationDiagnostic(eventConfig.id),
      reachable: result.reason !== "network" && result.reason !== "configuration",
    },
    event: result.event && {
      id: result.event.id,
      name: result.event.name,
      eventDate: result.event.event_date,
      registrationFee: result.event.registration_fee,
      isActive: result.event.is_active,
    },
    status: result.status,
    reason: result.reason,
  });
}
