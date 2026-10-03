export const ADMIN_EMAILS = [
  process.env.NEXT_PUBLIC_ADMIN_EMAIL_1,
  process.env.NEXT_PUBLIC_ADMIN_EMAIL_2,
].map((email) => email?.trim().toLowerCase() ?? "").filter(Boolean);

export function isAdminEmail(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}