import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/server";

const actions = new Set(["APPROVE", "REJECT", "MANUAL_APPROVE", "REISSUE"]);

export async function POST(request: Request, { params }: { params: { registrationId: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized || !auth.user) return NextResponse.json({ error: "Not authorised." }, { status: auth.user ? 403 : 401 });
  let body: { action?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid registration action." }, { status: 400 });
  }
  const action = body.action ?? "";
  const reason = body.reason?.trim().slice(0, 500) ?? "";
  if (!actions.has(action)) return NextResponse.json({ error: "This registration action is not available." }, { status: 400 });
  if (action === "MANUAL_APPROVE" && !reason) {
    return NextResponse.json({ error: "Enter a manual approval reason to continue." }, { status: 400 });
  }
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
  if (!eventId) return NextResponse.json({ error: "Event is not configured." }, { status: 503 });

  const { data, error } = await auth.supabase.rpc("admin_registration_action", {
    p_event_id: eventId,
    p_registration_id: params.registrationId,
    p_action: action,
    p_reason: reason || null,
  });
  if (error) {
    console.error("Admin registration action failed", error.message);
    return NextResponse.json({ error: "The registration could not be updated. Refresh and try again." }, { status: 409 });
  }
  return NextResponse.json({ result: data });
}
