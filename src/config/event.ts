export const eventConfig = {
  id: process.env.NEXT_PUBLIC_EVENT_ID ?? "",
  title: "NAVRANG 26 — Dandiya Night 2026",
  date: "2026-10-14",
  startsAt: "2026-10-14T15:00:00+05:30",
  dateLabel: "14 October 2026",
  time: "3:00 PM – 8:00 PM Onwards",
  venue: "GEC Buxar Campus",
  defaultFee: 200,
  eligibleBatches: ["2023", "2024", "2025", "2026"],
  branches: ["CSE", "ECE", "Civil", "Mechanical", "Other"],
  defaultCollege: "Government Engineering College, Buxar",
  payment: {
    utrLength: 12,
    utrFormat: "digits",
    maxScreenshotBytes: 5 * 1024 * 1024,
    acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
  },
  highlights: [
    ["Inauguration Ceremony", "A grand opening to the festive evening."],
    ["Special Cultural Act", "Durga Act & Vandana by the cultural team."],
    ["Dance & Garba", "Group Garba formations and Solo Dance performances."],
    [
      "Festive Music Policy",
      "Decent, festive songs managed by the student music committee. No vulgar or inappropriate tracks.",
    ],
    ["On-site facility", "Clean drinking water points across the venue."],
  ],
  flow: [
    "Grand Inauguration",
    "Durga Act & Vandana",
    "Solo Dance Performances",
    "Group Garba Formations",
    "Festive Music & Open Garba",
    "Event Closing",
  ],
  activities: [
    ["Inauguration Ceremony", "A thoughtful opening to bring the campus together for the evening."],
    ["Durga Act & Vandana", "A special cultural presentation by the student cultural team."],
    ["Solo Dance", "A stage for individual performers to share their expression."],
    ["Group Garba", "Traditional Garba formations, experienced together as a group."],
    ["Festive Music", "Decent, festive music curated by the student music committee. No vulgar or inappropriate tracks."],
    ["Campus Celebration", "An evening shaped by student participation, culture and community."],
  ],
  entryRules: [
    ["Mandatory ID check", "Entry is allowed only with a valid College ID Card. A Library Card may be accepted for students without a College ID."],
    ["Access control", "Entry is restricted to registered participants from eligible batches."],
    ["Campus decorum", "Please maintain discipline. Misconduct may be reported to the discipline committee."],
  ],
} as const;

export type PublicEvent = {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  registration_fee: number;
  is_active: boolean;
  venue?: string | null;
  event_time?: string | null;
};
