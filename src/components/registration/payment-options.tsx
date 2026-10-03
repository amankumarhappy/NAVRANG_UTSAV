"use client";

import Image from "next/image";
import { Check, Copy, Smartphone } from "lucide-react";
import { useState, type MouseEvent } from "react";

const supportedApps = [
  { name: "BHIM UPI", accent: "#0f6fff" },
  { name: "Google Pay", accent: "#1a73e8" },
  { name: "PhonePe", accent: "#6a38ff" },
  { name: "Navi", accent: "#4cbf9d" },
  { name: "WhatsApp Pay", accent: "#25d366" },
];

type Props = {
  paymentQr: string | null;
  paymentUri: string;
  upiId: string;
};

export function PaymentOptions({ paymentQr, paymentUri, upiId }: Props) {
  const [copied, setCopied] = useState(false);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenUpiApp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!paymentUri) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    if (typeof window !== "undefined") {
      window.location.href = paymentUri;
      window.setTimeout(() => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(upiId).catch(() => undefined);
        }
      }, 1200);
    }
  };

  return (
    <>
      <div className="payment-wallets" aria-label="Supported UPI apps for payment">
        {supportedApps.map((app) => (
          <span key={app.name} className="payment-wallet" style={{ borderColor: `${app.accent}55`, color: app.accent }}>
            {app.name}
          </span>
        ))}
      </div>

      <div className="payment-qr payment-qr-loading" aria-live="polite">
        {paymentQr ? (
          <Image className="payment-qr-image" src={paymentQr} alt={`UPI payment QR for ${upiId}`} width={224} height={224} unoptimized />
        ) : (
          <div className="qr-skeleton" aria-label="Preparing payment QR" />
        )}
        <div className="payment-qr-meta">
          <span>Official UPI ID</span>
          <strong>{upiId}</strong>
        </div>
      </div>

      <div className="payment-actions">
        <a className="button button-small" href={paymentUri} onClick={handleOpenUpiApp}>
          <Smartphone size={16} aria-hidden="true" />
          Open UPI app
        </a>
        <button className="button button-small button-outline" type="button" onClick={copyUpiId}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? "Copied" : "Copy UPI ID"}
        </button>
      </div>

      <p className="payment-safety">Pay to {upiId}. Open your preferred UPI app, paste the ID manually, and verify the payee name before sending.</p>
    </>
  );
}