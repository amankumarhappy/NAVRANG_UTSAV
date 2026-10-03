import { NextResponse } from "next/server";
import { site } from "@/config/site";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

export async function POST(request: Request) {
  let body: { registrationId?: string; identity?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your Registration ID and registered email or phone." }, { status: 400 });
  }
  const registrationId = body.registrationId?.trim().toUpperCase() ?? "";
  const identity = body.identity?.trim() ?? "";
  if (!/^REG-[A-Z0-9]{12}$/.test(registrationId) || identity.length < 6 || identity.length > 254) {
    return NextResponse.json({ error: "We couldn't match those details. Check them and try again." }, { status: 404 });
  }

  const supabase = createServiceSupabaseClient();
  const { data: registration, error } = await supabase
    .from("registrations")
    .select("registration_id,full_name,email,phone,roll_number,branch,batch,status,qr_token,pass_generated,event_id")
    .eq("registration_id", registrationId)
    .eq("event_id", process.env.NEXT_PUBLIC_EVENT_ID ?? "")
    .maybeSingle();
  if (error) {
    console.error("Pass retrieval lookup failed", error.message);
    return NextResponse.json({ error: "We could not retrieve your pass. Please try again." }, { status: 503 });
  }
  if (!registration) return NextResponse.json({ error: "We couldn't match those details. Check them and try again." }, { status: 404 });

  const normalizedIdentity = identity.toLowerCase();
  const emailMatches = normalizedIdentity === registration.email.toLowerCase();
  const phoneMatches = normalizePhone(identity) === normalizePhone(registration.phone);
  if (!emailMatches && !phoneMatches) {
    return NextResponse.json({ error: "We couldn't match those details. Check them and try again." }, { status: 404 });
  }
  if (registration.status === "PENDING") {
    return NextResponse.json({ status: "PENDING", message: "Payment verification is pending. Your entry pass will be issued after approval." }, { status: 200 });
  }
  if (registration.status === "REJECTED") {
    return NextResponse.json({ status: "REJECTED", message: "Your registration was not approved. Contact the event team." }, { status: 200 });
  }
  if (registration.status !== "APPROVED" || !registration.pass_generated || !registration.qr_token) {
    return NextResponse.json({ error: "Your pass is not available. Please contact the event team." }, { status: 409 });
  }
  const { data: eventData, error: eventError } = await supabase.rpc("get_active_event", {
    p_event_id: registration.event_id,
  });
  if (eventError) {
    console.error("Pass event details could not be loaded", eventError.message);
    return NextResponse.json({ error: "We could not retrieve your pass. Please try again." }, { status: 503 });
  }
  const event = Array.isArray(eventData) ? eventData[0] : eventData;
  if (!event) return NextResponse.json({ error: "Your event details could not be loaded. Please contact the event team." }, { status: 503 });
  return NextResponse.json({
    status: "APPROVED",
    pass: {
      registrationId: registration.registration_id,
      fullName: registration.full_name,
      rollNumber: registration.roll_number,
      branch: registration.branch,
      batch: registration.batch,
      qrToken: registration.qr_token,
      eventName: event.name,
      eventTitle: site.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      venue: event.venue,
    },
  });
}
