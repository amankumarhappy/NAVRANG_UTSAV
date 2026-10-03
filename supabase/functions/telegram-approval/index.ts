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
  const secret = Deno.env.get("TELEGRAM_APPROVAL_SECRET");
  if (!secret || !safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return json({ error: "Not authorized" }, 401);
  }

  let body: {
    eventId?: string;
    registrationId?: string;
    action?: string;
    reason?: string;
    telegramUserId?: string | number;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid approval request" }, 400);
  }

  const action = body.action ?? "";
  const eventId = body.eventId?.trim() ?? "";
  const registrationId = body.registrationId?.trim().toUpperCase() ?? "";
  const reason = body.reason?.trim().slice(0, 500) ?? "";
  const telegramUserId = String(body.telegramUserId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^REG-[A-Z0-9]{12}$/.test(registrationId) || !["APPROVE", "REJECT", "MANUAL_APPROVE"].includes(action)) {
    return json({ error: "Invalid registration action" }, 400);
  }
  if (action === "MANUAL_APPROVE" && !reason) return json({ error: "A reason is required for manual approval" }, 400);

  let adminMap: Record<string, string>;
  try {
    adminMap = JSON.parse(Deno.env.get("TELEGRAM_ADMIN_MAP") ?? "{}");
  } catch {
    console.error("Telegram admin map is invalid JSON.");
    return json({ error: "Approval is not configured" }, 503);
  }
  const adminId = adminMap[telegramUserId];
  if (!adminId || !/^[0-9a-f-]{36}$/i.test(adminId)) return json({ error: "This Telegram account is not authorized" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Telegram approval database secrets are not configured.");
    return json({ error: "Approval is temporarily unavailable" }, 503);
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/make_registration_action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        p_event_id: eventId,
        p_registration_id: registrationId,
        p_action: action,
        p_reason: reason || null,
        p_admin_id: adminId,
      }),
    });
    if (!response.ok) {
      console.error("Telegram approval database action was rejected", response.status);
      return json({ error: "Registration action was not completed" }, 409);
    }
    return json({ result: await response.json() });
  } catch (error) {
    console.error("Telegram approval database request failed", error);
    return json({ error: "Registration action was not completed" }, 503);
  }
});
