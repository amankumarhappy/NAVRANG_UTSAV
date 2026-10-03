import { NextResponse } from "next/server";
import { eventConfig } from "@/config/event";
import { createPublicSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { registrationSchema } from "@/lib/validation/registration";

const pendingPath = /^pending\/[0-9a-f-]{36}\.(png|jpg|webp)$/i;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Complete the registration form and try again." }, { status: 400 });
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted registration details and try again.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const paymentScreenshotPath = body && typeof body === "object" &&
    "paymentScreenshotPath" in body && typeof body.paymentScreenshotPath === "string"
    ? body.paymentScreenshotPath
    : "";
  if (!pendingPath.test(paymentScreenshotPath)) {
    return NextResponse.json({ error: "Payment screenshot could not be verified. Please upload it again." }, { status: 400 });
  }
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
  if (!eventId) return NextResponse.json({ error: "Registration is not configured. Please contact the event team." }, { status: 503 });
  const supabase = createServiceSupabaseClient();
  const removeUnclaimedScreenshot = async () => {
    const { error } = await supabase.storage.from("payment-screenshots").remove([paymentScreenshotPath]);
    if (error) console.error("Could not remove an unclaimed payment screenshot", error.message);
  };
  if (!process.env.NEXT_PUBLIC_UPI_ID?.trim()) {
    await removeUnclaimedScreenshot();
    return NextResponse.json({ error: "Registration is not open until the official UPI details are configured." }, { status: 409 });
  }

  const { data: eventData, error: eventError } = await supabase.rpc("get_active_event", { p_event_id: eventId });
  const event = Array.isArray(eventData) ? eventData[0] : eventData;
  if (eventError) {
    console.error("Registration event validation failed", eventError.message);
    await removeUnclaimedScreenshot();
    return NextResponse.json({ error: "We could not validate the event. Please try again shortly." }, { status: 503 });
  }
  if (!event || !event.is_active) {
    await removeUnclaimedScreenshot();
    return NextResponse.json({ error: "Registration for this event is currently closed." }, { status: 409 });
  }

  const { data: files, error: listError } = await supabase.storage.from("payment-screenshots").list("pending", {
    search: paymentScreenshotPath.split("/").pop(),
    limit: 1,
  });
  if (listError || !files?.some((item) => `${"pending"}/${item.name}` === paymentScreenshotPath)) {
    return NextResponse.json({ error: "Payment screenshot could not be verified. Please upload it again." }, { status: 400 });
  }
  const { data: screenshot, error: downloadError } = await supabase.storage.from("payment-screenshots").download(paymentScreenshotPath);
  if (downloadError || !screenshot || screenshot.size > eventConfig.payment.maxScreenshotBytes) {
    console.error("Could not validate the uploaded payment screenshot", downloadError?.message);
    await removeUnclaimedScreenshot();
    return NextResponse.json({ error: "Payment screenshot could not be verified. Please upload it again." }, { status: 400 });
  }
  const bytes = new Uint8Array(await screenshot.slice(0, 12).arrayBuffer());
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!isPng && !isJpeg && !isWebp) {
    await removeUnclaimedScreenshot();
    return NextResponse.json({ error: "Choose a valid PNG, JPG, JPEG or WEBP payment screenshot." }, { status: 400 });
  }

  const publicSupabase = createPublicSupabaseClient();
  const { data, error } = await publicSupabase.rpc("create_registration", {
    p_event_id: eventId,
    p_full_name: parsed.data.fullName,
    p_roll_number: parsed.data.rollNumber,
    p_branch: parsed.data.branch,
    p_batch: parsed.data.batch,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email,
    p_college: parsed.data.college,
    p_transaction_id: parsed.data.transactionId,
    p_payment_screenshot_path: paymentScreenshotPath,
  });
  if (error) {
    await removeUnclaimedScreenshot();
    const message = error.message.toLowerCase();
    if (message.includes("transaction")) {
      return NextResponse.json({ error: "This transaction ID has already been used for a registration." }, { status: 409 });
    }
    if (message.includes("roll")) {
      return NextResponse.json({ error: "This roll number is already registered for this event." }, { status: 409 });
    }
    if (message.includes("email") || message.includes("phone")) {
      return NextResponse.json({ error: "These contact details are already registered for this event." }, { status: 409 });
    }
    if (message.includes("closed") || message.includes("inactive")) {
      return NextResponse.json({ error: "Registration for this event is currently closed." }, { status: 409 });
    }
    console.error("Secure registration RPC failed", error.message);
    return NextResponse.json({ error: "We could not complete your registration. Please try again." }, { status: 503 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  const registrationId = typeof result === "string"
    ? result
    : result && typeof result === "object" && "registration_id" in result
      ? String(result.registration_id)
      : null;
  if (!registrationId) {
    console.error("Registration RPC completed without a public registration ID.");
    return NextResponse.json({ error: "We could not complete your registration. Please contact the event team." }, { status: 502 });
  }
  return NextResponse.json({ registrationId }, { status: 201 });
}
