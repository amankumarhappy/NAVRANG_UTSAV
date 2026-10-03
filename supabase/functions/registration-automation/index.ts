const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expected = Deno.env.get("NAVRANG_DATABASE_WEBHOOK_SECRET");
  if (!expected || !safeEqual(request.headers.get("authorization") ?? "", `Bearer ${expected}`)) {
    return json({ error: "Not authorized" }, 401);
  }

  let webhook: {
    type?: string;
    table?: string;
    record?: Record<string, unknown>;
    old_record?: Record<string, unknown>;
  };
  try {
    webhook = await request.json();
  } catch {
    return json({ error: "Invalid database webhook payload" }, 400);
  }
  if (webhook.table !== "registrations" || !webhook.record) {
    return json({ error: "Unsupported database event" }, 400);
  }

  const row = webhook.record;
  const oldStatus = String(webhook.old_record?.status ?? "");
  const status = String(row.status ?? "");
  const action = webhook.type === "INSERT" && status === "PENDING"
    ? "NEW_REGISTRATION"
    : webhook.type === "UPDATE" && oldStatus !== status && ["APPROVED", "REJECTED"].includes(status)
      ? `REGISTRATION_${status}`
      : null;
  if (!action) return json({ delivered: false, reason: "No automation is configured for this change." });

  const webhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
  const webhookSecret = Deno.env.get("MAKE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookUrl || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Make automation secrets are not configured.");
    return json({ error: "Automation is temporarily unavailable" }, 503);
  }

  let event: Record<string, unknown> | null;
  try {
    const eventResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_active_event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ p_event_id: row.event_id }),
    });
    if (!eventResponse.ok) throw new Error(`Event lookup returned ${eventResponse.status}`);
    event = await eventResponse.json();
  } catch (error) {
    console.error("Could not load current event details for automation", error);
    return json({ error: "Event details could not be loaded" }, 503);
  }
  if (!event || typeof event !== "object") return json({ error: "Event details could not be loaded" }, 503);

  const payload = {
    event: action,
    eventId: row.event_id,
    registrationId: row.registration_id,
    fullName: row.full_name,
    email: row.email,
    rollNumber: row.roll_number,
    branch: row.branch,
    batch: row.batch,
    amount: row.amount_paid,
    transactionId: row.transaction_id,
    status,
    eventName: event.name ?? "NAVRANG 26",
    eventDate: event.event_date,
    venue: event.venue ?? "GEC Buxar Campus",
    passRecoveryUrl: `${Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? ""}/get-pass`,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Make automation returned a non-success status", response.status);
      return json({ error: "Automation delivery failed" }, 502);
    }
    return json({ delivered: true, event: action });
  } catch (error) {
    console.error("Make automation request failed", error);
    return json({ error: "Automation delivery failed" }, 502);
  }
});
