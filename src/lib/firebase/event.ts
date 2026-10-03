import { eventConfig, type PublicEvent } from "@/config/event";

export type FirebaseEvent = {
  id: "NAVRANG_2026";
  name: string;
  date: string;
  time: string;
  venue: string;
  registrationFee: number;
  isActive: boolean;
  eligibility: { batches: string[] };
  description?: string;
};

const configuredEvent: FirebaseEvent = {
  id: "NAVRANG_2026",
  name: eventConfig.title,
  date: eventConfig.date,
  time: eventConfig.time,
  venue: eventConfig.venue,
  registrationFee: eventConfig.defaultFee,
  isActive: true,
  eligibility: { batches: [...eventConfig.eligibleBatches] },
  description: "An enchanting evening of Garba, culture, music, and togetherness — celebrating the spirit of Navratri with the GEC Buxar campus.",
};

export type FirebaseEventResult = {
  event: FirebaseEvent | null;
  status: "ready" | "closed" | "not-found" | "unconfigured" | "network-error";
};

export async function getFirebaseEvent(): Promise<FirebaseEventResult> {
  const databaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
  if (!databaseUrl) return { event: null, status: "unconfigured" };
  try {
    const response = await fetch(`${databaseUrl.replace(/\/+$/, "")}/events/NAVRANG_2026.json`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) {
      console.warn(`Firebase event read failed: status=${response.status}`);
      return { event: null, status: "network-error" };
    }
    const event = await response.json() as FirebaseEvent | null;
    if (!event) return { event: null, status: "not-found" };
    if (event.id !== "NAVRANG_2026" || typeof event.isActive !== "boolean") {
      console.error("Firebase NAVRANG_2026 event data is invalid.");
      return { event: null, status: "not-found" };
    }
    return { event, status: event.isActive ? "ready" : "closed" };
  } catch (error) {
    console.warn("Firebase event read failed", error instanceof Error ? error.message : "unknown error");
    return { event: null, status: "network-error" };
  }
}

export async function getConfiguredPublicEvent(): Promise<PublicEvent> {
  const result = await getFirebaseEvent();
  const event = result.event;
  if (!event) {
    return {
      id: "NAVRANG_2026",
      name: eventConfig.title,
      description: configuredEvent.description ?? null,
      event_date: eventConfig.date,
      registration_fee: eventConfig.defaultFee,
      is_active: false,
      venue: eventConfig.venue,
      event_time: eventConfig.time,
    };
  }
  return {
    id: event.id,
    name: event.name,
    description: event.description ?? null,
    event_date: event.date,
    registration_fee: event.registrationFee,
    is_active: event.isActive,
    venue: event.venue,
    event_time: event.time,
  };
}