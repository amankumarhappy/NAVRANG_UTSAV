import { NextResponse } from "next/server";
import { getFirebaseEvent } from "@/lib/firebase/event";

export async function GET() {
  const { event, status } = await getFirebaseEvent();
  const databaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim() ?? "";
  return NextResponse.json({
    firebase: {
      projectConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      databaseConfigured: !!databaseUrl,
      reachable: status !== "network-error" && status !== "unconfigured",
    },
    event: event && {
      id: event.id,
      name: event.name,
      date: event.date,
      registrationFee: event.registrationFee,
      isActive: event.isActive,
    },
    status,
  });
}
