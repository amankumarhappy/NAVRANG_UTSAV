type PublicSupabaseConfig = {
  url: string;
  key: string;
};

export class SupabaseConfigurationError extends Error {
  constructor(public readonly code: "missing-url" | "missing-public-key" | "invalid-url" | "missing-service-key") {
    super(`Supabase configuration error: ${code}`);
    this.name = "SupabaseConfigurationError";
  }
}

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getSupabasePublicConfig(): PublicSupabaseConfig {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url) throw new SupabaseConfigurationError("missing-url");
  if (!key) throw new SupabaseConfigurationError("missing-public-key");
  try {
    new URL(url);
  } catch {
    throw new SupabaseConfigurationError("invalid-url");
  }
  return { url, key };
}

export function getSupabaseServiceConfig() {
  const { url } = getSupabasePublicConfig();
  const key = readEnv("SUPABASE_SECRET_KEY") || readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new SupabaseConfigurationError("missing-service-key");
  return { url, key };
}

export function getSupabaseConfigurationDiagnostic(eventId: string) {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publicKey = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = readEnv("SUPABASE_SECRET_KEY") || readEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    urlConfigured: Boolean(url),
    publicKeyConfigured: Boolean(publicKey),
    serviceKeyConfigured: Boolean(serviceKey),
    configuredEventId: eventId || null,
    eventIdValid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId),
  };
}
