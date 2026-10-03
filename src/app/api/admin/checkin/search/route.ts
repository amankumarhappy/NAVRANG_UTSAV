import { NextResponse } from "next/server";
import { requireAdmin, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Not authorised." }, { status: auth.user ? 403 : 401 });
  const params = new URL(request.url).searchParams;
  const term = (params.get("q") ?? "").trim().replace(/[%_*(),.]/g, "").slice(0, 80);
  const by = params.get("by") ?? "name";
  if (term.length < 2) return NextResponse.json({ rows: [] });
  const column = by === "registration" ? "registration_id" : by === "phone" ? "phone" : "full_name";
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("registrations")
    .select("id,registration_id,full_name,roll_number,branch,batch,phone,status")
    .eq("event_id", process.env.NEXT_PUBLIC_EVENT_ID ?? "")
    .ilike(column, `%${term}%`).order("created_at", { ascending: false }).limit(20);
  if (error) {
    console.error("Manual check-in search failed", error.message);
    return NextResponse.json({ error: "Search could not be completed." }, { status: 503 });
  }
  const ids = (data ?? []).map((row) => row.id);
  const checks = ids.length
    ? await supabase.from("checkins").select("registration_id,checked_in_at").in("registration_id", ids)
    : { data: [], error: null };
  if (checks.error) {
    console.error("Manual check-in status lookup failed", checks.error.message);
    return NextResponse.json({ error: "Check-in status could not be loaded." }, { status: 503 });
  }
  const checkedById = new Map((checks.data ?? []).map((row) => [row.registration_id, row.checked_in_at]));
  return NextResponse.json({ rows: (data ?? []).map((row) => ({ ...row, checked_in_at: checkedById.get(row.id) ?? null })) });
}
