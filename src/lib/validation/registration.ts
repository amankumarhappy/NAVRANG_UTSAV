import { z } from "zod";
import { eventConfig } from "@/config/event";

const transactionCharacterPattern = eventConfig.payment.utrFormat === "digits" ? "\\d" : "[A-Za-z0-9]";
const transactionPattern = new RegExp(`^${transactionCharacterPattern}{${eventConfig.payment.utrLength}}$`);

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  rollNumber: z.string().trim().min(2, "Enter your roll number.").max(40),
  branch: z.string().trim().min(1, "Choose your branch."),
  batch: z.string().refine((value) => eventConfig.eligibleBatches.some((batch) => batch === value), "Choose an eligible batch."),
  phone: z.string().trim().max(20).refine(
    (value) => /^\+?[0-9 ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 10 && value.replace(/\D/g, "").length <= 13,
    "Enter a valid phone number with 10–13 digits.",
  ),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  college: z.string().trim().min(2, "Enter your college.").max(160),
  transactionId: z.string().trim().regex(transactionPattern, `Enter a ${eventConfig.payment.utrLength}-digit transaction/UTR ID.`),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
