"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { eventConfig } from "@/config/event";
import { site } from "@/config/site";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registrationSchema, type RegistrationInput } from "@/lib/validation/registration";
import { formatRupees } from "@/lib/utils";

type Props = { fee: number; eventActive: boolean };

export function RegistrationForm({ fee, eventActive }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgementError, setAcknowledgementError] = useState("");
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { college: eventConfig.defaultCollege },
  });

  const submit = async (values: RegistrationInput) => {
    if (!acknowledged) {
      setAcknowledgementError("Confirm that you understand payment verification is still required.");
      return;
    }
    if (!file) {
      setFileError("Payment screenshot is required.");
      return;
    }
    if (!eventActive) {
      toast.error("Registration is unavailable until event details can be verified.");
      return;
    }
    setBusy(true);
    setFileError("");
    try {
      const uploadResponse = await fetch("/api/registration/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size, fileName: file.name }),
      });
      const upload = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(upload.error ?? "Payment screenshot could not be uploaded. Please try again.");

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error("Payment screenshot could not be uploaded. Please try again.");

      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, paymentScreenshotPath: upload.path }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We could not complete your registration. Please try again.");
      toast.success("Registration submitted");
      router.push(`/registration-success?id=${encodeURIComponent(result.registrationId)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not complete your registration. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = (name: keyof RegistrationInput, label: string, placeholder = "", type = "text") => (
    <div className="field" key={name}>
      <label htmlFor={name}>{label} <span aria-hidden="true">*</span></label>
      <input id={name} type={type} placeholder={placeholder} autoComplete={name === "email" ? "email" : name === "phone" ? "tel" : undefined} {...register(name)} aria-invalid={!!errors[name]} />
      <span className="field-error" role="alert">{errors[name]?.message}</span>
    </div>
  );

  return (
    <form className="form-card" onSubmit={handleSubmit(submit)} noValidate>
      <section className="form-section" aria-labelledby="student-details">
        <h2 id="student-details">01 — Your details</h2>
        <div className="field-grid">
          {field("fullName", "Full name", "As shown on your College ID")}
          {field("rollNumber", "Roll number / registration number")}
          <div className="field"><label htmlFor="branch">Branch <span aria-hidden="true">*</span></label><select id="branch" defaultValue="" {...register("branch")}><option value="" disabled>Select branch</option>{eventConfig.branches.map((branch) => <option key={branch}>{branch}</option>)}</select><span className="field-error" role="alert">{errors.branch?.message}</span></div>
          <div className="field"><label htmlFor="batch">Batch <span aria-hidden="true">*</span></label><select id="batch" defaultValue="" {...register("batch")}><option value="" disabled>Select batch</option>{eventConfig.eligibleBatches.map((batch) => <option key={batch}>{batch}</option>)}</select><span className="field-error" role="alert">{errors.batch?.message}</span></div>
          {field("phone", "Phone number", "10-digit mobile number", "tel")}
          {field("email", "Email address", "you@example.com", "email")}
          {field("college", "College", eventConfig.defaultCollege)}
        </div>
      </section>
      <section className="form-section" aria-labelledby="payment-details">
        <h2 id="payment-details">02 — Payment verification</h2>
        <div className="field">
          <label htmlFor="transactionId">Transaction / UTR ID <span aria-hidden="true">*</span></label>
          <input id="transactionId" inputMode="numeric" autoComplete="off" placeholder={`${eventConfig.payment.utrLength}-digit UTR / transaction ID`} {...register("transactionId")} aria-invalid={!!errors.transactionId} />
          <span className="field-error" role="alert">{errors.transactionId?.message}</span>
        </div>
        <div className="field">
          <label htmlFor="paymentScreenshot">Payment screenshot <span aria-hidden="true">*</span></label>
          <div className="upload-field">
            <input id="paymentScreenshot" type="file" accept={eventConfig.payment.acceptedExtensions.join(",")} onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              if (selected && !eventConfig.payment.acceptedMimeTypes.some((type) => type === selected.type)) {
                setFile(null);
                setFileError("Choose a PNG, JPG, JPEG or WEBP image.");
              } else if (selected && selected.size > eventConfig.payment.maxScreenshotBytes) {
                setFile(null);
                setFileError("The screenshot must be 5MB or smaller.");
              } else {
                setFile(selected);
                setFileError("");
              }
            }} aria-describedby="screenshot-help" />
            <p id="screenshot-help" className="help-text">PNG, JPG, JPEG or WEBP · Max 5MB. Make sure the transaction/UTR number is clearly visible in the screenshot.</p>
          </div>
          <span className="field-error" role="alert">{fileError}</span>
        </div>
        <label className="checkline"><input type="checkbox" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setAcknowledgementError(""); }} aria-describedby="verification-ack-error" /> <span>I understand this registration remains <strong>pending verification</strong> until an authorised admin verifies the payment. Submission does not confirm my entry.</span></label>
        <span className="field-error" id="verification-ack-error" role="alert">{acknowledgementError}</span>
      </section>
      <button className="button form-submit" type="submit" disabled={busy || !eventActive} aria-busy={busy}>
        {busy ? "Submitting securely…" : `Submit registration · ${formatRupees(fee)}`}
      </button>
      <p className="toast-note center space-top">Your payment screenshot stays in private storage and is reviewed only by authorised event admins.</p>
    </form>
  );
}
