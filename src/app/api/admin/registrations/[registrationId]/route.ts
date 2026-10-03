import { NextResponse } from "next/server";
import { requireAdmin, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: { registrationId: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Not authorised." }, { status: auth.user ? 403 : 401 });
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("registrations")
    .select("id,registration_id,event_id,full_name,roll_number,branch,batch,phone,email,college,transaction_id,amount_paid,payment_screenshot_path,status,pass_generated,qr_token,created_at,updated_at")
    .eq("registration_id", params.registrationId)
    .eq("event_id", process.env.NEXT_PUBLIC_EVENT_ID ?? "")
    .maybeSingle();
  if (error) {
    console.error("Admin registration details failed", error.message);
    return NextResponse.json({ error: "Registration details could not be loaded." }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  const { data: signed, error: signedError } = await supabase.storage.from("payment-screenshots")
    .createSignedUrl(data.payment_screenshot_path, 300);
  if (signedError) {
    console.error("Could not create private payment screenshot URL", signedError.message);
    return NextResponse.json({ error: "Payment screenshot could not be opened." }, { status: 503 });
  }
  return NextResponse.json({ registration: {
    ...data,
    payment_screenshot_url: signed.signedUrl,
    qr_token: data.status === "APPROVED" && data.pass_generated ? data.qr_token : null,
  } });
}
