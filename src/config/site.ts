export const site = {
  name: "NAVRANG 26",
  title: "Dandiya Night 2026",
  tagline: "An evening of Garba, culture, music and campus celebration.",
  description:
    "NAVRANG 26 — Dandiya Night 2026 at Government Engineering College, Buxar. Register for the festive campus celebration.",
  college: "Government Engineering College, Buxar",
  venue: "GEC Buxar Campus",
  time: "3:00 PM – 8:00 PM Onwards",
  eventDateLabel: "14 October 2026",
  year: "2026",
  logoPath: "/assets/gec-buxar-logo.png",
  logoUrl:
    process.env.NEXT_PUBLIC_COLLEGE_LOGO_URL ??
    "https://i.ibb.co/RpG0L4Nw/Logo-of-GEC-Buxar-1.png",
  contacts: {
    officialEmail: "",
    studentCoordinator: "",
    facultyCoordinator: "",
    instagram: "",
    linkedin: "",
    otherSocial: "",
  },
  upi: {
    id: process.env.NEXT_PUBLIC_UPI_ID ?? "",
    name: process.env.NEXT_PUBLIC_UPI_NAME ?? "",
  },
} as const;
