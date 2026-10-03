"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { eventConfig } from "@/config/event";
import { site } from "@/config/site";
import { ensurePublicFirebaseSession } from "@/lib/firebase/auth";
import { compressPaymentScreenshot } from "@/lib/image/compress-payment-screenshot";
import { createFirebaseRegistration } from "@/lib/firebase/registrations";
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
  const [loadingMessage, setLoadingMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const previewUrlRef = useRef("");
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { college: eventConfig.defaultCollege },
  });

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const selectFile = (selected: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = selected ? URL.createObjectURL(selected) : "";
    setPreviewUrl(previewUrlRef.current);
    setFile(selected);
  };

  const submit = async (values: RegistrationInput) => {
    if (!acknowledged) {
      setAcknowledgementError("Please acknowledge that payment verification is required.");
      return;
    }
    if (!file) {
      setFileError("Payment screenshot is required.");
      return;
    }
    if (!eventActive) {
      toast.error("Registration is not available right now. Please try again shortly.");
      return;
    }
    setBusy(true);
    setLoadingMessage("Compressing payment screenshot…");
    setFileError("");
    try {
      const screenshot = await compressPaymentScreenshot(file);
      setCompressedSize(screenshot.sizeBytes);
      await ensurePublicFirebaseSession();
      setLoadingMessage("Saving your registration securely…");
      const result = await createFirebaseRegistration(values, screenshot);
      toast.success("Registration submitted");
      router.push(`/registration-success?id=${encodeURIComponent(result.registrationId)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not complete your registration. Please try again.");
    } finally {
      setBusy(false);
      setLoadingMessage("");
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
              setCompressedSize(null);
              if (selected && !eventConfig.payment.acceptedMimeTypes.some((type) => type === selected.type)) {
                selectFile(null);
                setFileError("Choose a PNG, JPG, JPEG or WEBP image.");
              } else if (selected && selected.size > eventConfig.payment.maxScreenshotBytes) {
                selectFile(null);
                setFileError("The screenshot must be 5MB or smaller.");
              } else {
                selectFile(selected);
                setFileError("");
              }
            }} aria-describedby="screenshot-help" />
            <p id="screenshot-help" className="help-text">PNG, JPG, JPEG or WEBP · Max 5MB. Make sure the transaction/UTR number is clearly visible in the screenshot.</p>
          </div>
          {previewUrl && <div className="screenshot-preview"><Image src={previewUrl} alt="Selected payment screenshot preview" width={240} height={180} unoptimized style={{ width: "min(100%, 240px)", height: "auto", objectFit: "contain" }} /><span>{file?.name}{compressedSize ? ` · ${(compressedSize / 1024).toFixed(0)} KB compressed` : " · preview"}</span></div>}
          <span className="field-error" role="alert">{fileError}</span>
        </div>
        <label className="checkline"><input type="checkbox" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setAcknowledgementError(""); }} aria-describedby="verification-ack-error" /> <span>I understand that my payment must be verified by an authorised admin before an entry pass is issued.</span></label>
        <span className="field-error" id="verification-ack-error" role="alert">{acknowledgementError}</span>
      </section>
      <button className="button form-submit" type="submit" disabled={busy || !eventActive} aria-busy={busy}>
        {busy && <span className="loading-spinner" aria-hidden="true" />}
        <span>{busy ? loadingMessage : `Submit registration · ${formatRupees(fee)}`}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{loadingMessage}</span>
      <p className="toast-note center space-top">Your payment screenshot stays in private storage and is reviewed only by authorised event admins.</p>
    </form>
  );
}
