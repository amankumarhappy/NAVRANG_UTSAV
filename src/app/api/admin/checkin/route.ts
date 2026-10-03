import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized || !auth.user) return NextResponse.json({ error: "Not authorised." }, { status: auth.user ? 403 : 401 });
  let body: { token?: string; registrationId?: string; manual?: boolean; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The check-in request could not be read." }, { status: 400 });
  }
  if (body.manual && (!body.registrationId || !body.reason?.trim())) {
    return NextResponse.json({ error: "Choose a registration and enter a manual check-in reason." }, { status: 400 });
  }
  if (!body.manual && !body.token) return NextResponse.json({ error: "No QR token was provided." }, { status: 400 });
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
  if (!eventId) return NextResponse.json({ error: "Event is not configured." }, { status: 503 });

  const { data, error } = await auth.supabase.rpc("admin_checkin_registration", {
    p_event_id: eventId,
    p_qr_token: body.manual ? null : body.token,
    p_registration_id: body.manual ? body.registrationId : null,
    p_manual: !!body.manual,
    p_reason: body.reason?.trim() || null,
  });
  if (error) {
    console.error("Secure check-in RPC failed", error.message);
    return NextResponse.json({ error: "Check-in could not be completed. Please try again." }, { status: 503 });
  }
  return NextResponse.json(data);
}
