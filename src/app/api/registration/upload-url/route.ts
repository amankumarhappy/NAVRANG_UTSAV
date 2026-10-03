import { NextResponse } from "next/server";
import { eventConfig } from "@/config/event";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const extensionByType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  let body: { contentType?: string; size?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid payment screenshot." }, { status: 400 });
  }
  const contentType = body.contentType ?? "";
  if (!eventConfig.payment.acceptedMimeTypes.some((type) => type === contentType)) {
    return NextResponse.json({ error: "Choose a PNG, JPG, JPEG or WEBP image." }, { status: 400 });
  }
  if (!Number.isInteger(body.size) || !body.size || body.size < 1 || body.size > eventConfig.payment.maxScreenshotBytes) {
    return NextResponse.json({ error: "The screenshot must be 5MB or smaller." }, { status: 400 });
  }
  if (!process.env.NEXT_PUBLIC_UPI_ID?.trim() || !process.env.NEXT_PUBLIC_UPI_NAME?.trim()) {
    return NextResponse.json({ error: "Registration is not open until the official UPI ID and name are configured." }, { status: 409 });
  }
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
  if (!eventId) return NextResponse.json({ error: "Registration is not configured." }, { status: 503 });

  try {
    const supabase = createServiceSupabaseClient();
    const { data: eventData, error: eventError } = await supabase.rpc("get_active_event", { p_event_id: eventId });
    const event = Array.isArray(eventData) ? eventData[0] : eventData;
    if (eventError) {
      console.error("Registration event validation failed", eventError.message);
      return NextResponse.json({ error: "We could not validate the event. Please try again shortly." }, { status: 503 });
    }
    if (!event || !event.is_active) {
      return NextResponse.json({ error: "Registration for this event is currently closed." }, { status: 409 });
    }
    const path = `pending/${crypto.randomUUID()}.${extensionByType[contentType]}`;
    const { data, error } = await supabase.storage.from("payment-screenshots").createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Could not issue a payment screenshot upload URL", error?.message);
      return NextResponse.json({ error: "Payment screenshot could not be uploaded. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ path: data.path, token: data.token });
  } catch (error) {
    console.error("Payment screenshot upload URL request failed", error);
    return NextResponse.json({ error: "Payment screenshot could not be uploaded. Please try again." }, { status: 503 });
  }
}
