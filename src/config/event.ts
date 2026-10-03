export const eventConfig = {
  title: "NAVRANG ’26 — Dandiya Night 2026",
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
    ["Inauguration Ceremony", "A graceful opening ceremony to begin the evening of celebration."],
    ["Special Cultural Presentation", "A soulful Durga Vandana followed by a special cultural performance by the college team."],
    ["Garba & Dance Performances", "Experience vibrant Garba formations, traditional dances and energetic student performances."],
    ["Music & Celebration", "Enjoy an evening of festive music, Garba beats and joyful celebrations curated for the Navrang ’26 experience."],
    ["Guest & Student Amenities", "Drinking water and essential on-site facilities will be available throughout the venue for the convenience of attendees."],
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
    ["Mandatory College ID", "Entry will be permitted only after verification of a valid College ID Card. Students without a College ID may carry their Library Card as an alternative identification document."],
    ["Registered Participants Only", "Entry is restricted to registered and eligible participants. Please do not attempt to enter the event using another student’s registration or credentials."],
    ["Maintain Campus Discipline", "All students are expected to maintain proper discipline and decorum throughout the event. Please follow the instructions of the organising team, volunteers and college authorities."],
    ["Respectful Conduct", "NAVRANG ’26 is a celebration for the entire college community. Misbehaviour, arguments, harassment, abusive language or any inappropriate conduct will not be tolerated."],
    ["Respect the Campus", "Please respect the college premises and event arrangements. Do not damage, move or misuse campus property, decorations, equipment or other event facilities."],
    ["Follow Event Instructions", "For everyone’s safety, please follow instructions regarding entry, movement, crowd management, performance areas and restricted zones. Do not enter backstage or restricted areas without permission."],
    ["Responsible Celebration", "Celebrate responsibly and ensure that your actions do not cause inconvenience, discomfort or safety concerns for others. Keep the venue clean and use designated waste bins."],
    ["Safety & Cooperation", "In case of any issue, please immediately contact an event volunteer, organising team member or college authority rather than creating a disturbance."],
    ["Collective Responsibility", "The success of NAVRANG ’26 depends on everyone’s cooperation and responsible participation. Celebrate with enthusiasm while preserving the dignity of our college."],
    ["Traditional Dress Code", "Traditional attire is requested for both boys and girls."],
    ["Bring Your Dandiya Sticks", "Please bring your own Dandiya sticks for the celebration."],
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
