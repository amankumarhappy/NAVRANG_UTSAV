import { NextResponse } from "next/server";
import { requireAdmin, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Not authorised." }, { status: auth.user ? 403 : 401 });
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
  if (!eventId) return NextResponse.json({ error: "Event is not configured." }, { status: 503 });
  const supabase = createServiceSupabaseClient();
  const counts = await Promise.all([
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "PENDING"),
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "APPROVED"),
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "REJECTED"),
    supabase.from("checkins").select("registration_id,registrations!inner(event_id)", { count: "exact", head: true }).eq("registrations.event_id", eventId),
  ]);
  const failed = counts.find((result) => result.error);
  if (failed?.error) {
    console.error("Admin dashboard statistics failed", failed.error.message);
    return NextResponse.json({ error: "Dashboard statistics could not be loaded." }, { status: 503 });
  }
  return NextResponse.json({
    total: counts[0].count ?? 0, pending: counts[1].count ?? 0,
    approved: counts[2].count ?? 0, rejected: counts[3].count ?? 0,
    checkedIn: counts[4].count ?? 0,
  });
}
