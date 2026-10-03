import { NextResponse } from "next/server";
import { requireAdmin, createServiceSupabaseClient } from "@/lib/supabase/server";

const allowedSorts = new Set(["created_at", "registration_id", "full_name"]);
const allowedStatuses = new Set(["PENDING", "APPROVED", "REJECTED"]);

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Not authorised." }, { status: auth.user ? 403 : 401 });
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
  if (!eventId) return NextResponse.json({ error: "Event is not configured." }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sort = params.get("sort") ?? "created_at";
  const direction = params.get("direction") === "asc";
  const search = (params.get("search") ?? "").trim().slice(0, 100);

  const supabase = createServiceSupabaseClient();
  let query = supabase.from("registrations")
    .select("registration_id,full_name,roll_number,branch,batch,phone,email,transaction_id,amount_paid,status,created_at", { count: "exact" })
    .eq("event_id", eventId);
  const status = params.get("status") ?? "";
  const branch = params.get("branch") ?? "";
  const batch = params.get("batch") ?? "";
  const searchBy = params.get("searchBy") ?? "name";
  if (allowedStatuses.has(status)) query = query.eq("status", status);
  if (branch && branch.length < 60) query = query.eq("branch", branch);
  if (/^(2023|2024|2025|2026)$/.test(batch)) query = query.eq("batch", batch);
  if (search) {
    const safeSearch = search.replace(/[%_*(),.]/g, "").slice(0, 80);
    if (safeSearch) {
      const column = searchBy === "registration" ? "registration_id"
        : searchBy === "transaction" ? "transaction_id"
          : searchBy === "email" ? "email"
            : searchBy === "roll" ? "roll_number"
            : searchBy === "phone" ? "phone"
              : "full_name";
      query = query.ilike(column, `%${safeSearch}%`);
    }
  }
  const startDate = params.get("from");
  const endDate = params.get("to");
  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const dayAfter = new Date(`${endDate}T00:00:00.000Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    query = query.lt("created_at", dayAfter.toISOString());
  }
  query = query.order(allowedSorts.has(sort) ? sort : "created_at", { ascending: direction }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("Admin registration listing failed", error.message);
    return NextResponse.json({ error: "Registrations could not be loaded." }, { status: 503 });
  }
  return NextResponse.json({ rows: data ?? [], count: count ?? 0, page, pageSize });
}
