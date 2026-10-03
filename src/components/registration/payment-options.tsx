"use client";

import Image, { type StaticImageData } from "next/image";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import terminal1 from "@/assets/QR Code Terminal/REAL QR 4.jpeg";
import terminal3 from "@/assets/QR Code Terminal/REAL QR 2.jpeg";
import terminal4 from "@/assets/QR Code Terminal/REAL QR 3.jpeg";
import terminal5 from "@/assets/QR Code Terminal/REAL QR 5.jpeg";
import terminal6 from "@/assets/QR Code Terminal/REAL QR.jpeg";
import practiceQr from "@/assets/QR Code Terminal/QR PAYMENT TEST.png";

type Props = {
  paymentQr: string | null;
  paymentUri: string;
  upiId: string;
};

type Terminal = {
  id: string;
  name: string;
  reference: string;
  image: StaticImageData;
};

const terminals: Terminal[] = [
  { id: "terminal-1", name: "Terminal 1", reference: "Q923418621", image: terminal1 },
  { id: "terminal-3", name: "Terminal 3", reference: "Q363396936", image: terminal3 },
  { id: "terminal-4", name: "Terminal 4", reference: "Q378313096", image: terminal4 },
  { id: "terminal-5", name: "Terminal 5", reference: "Q977282233", image: terminal5 },
  { id: "terminal-6", name: "Terminal 6", reference: "Q246090031", image: terminal6 },
];

export function PaymentOptions({ paymentQr, paymentUri, upiId }: Props) {
  const [selected, setSelected] = useState("upi");
  const [copied, setCopied] = useState(false);
  const terminal = terminals.find((item) => item.id === selected);
  const isPractice = selected === "practice";

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="payment-choice-list" role="radiogroup" aria-label="Choose a payment QR">
        <button className="payment-choice" type="button" role="radio" aria-checked={selected === "upi"} onClick={() => setSelected("upi")}>
          <span>UPI ID</span><small>{upiId}</small>
        </button>
        {terminals.map((item) => (
          <button className="payment-choice" type="button" role="radio" aria-checked={selected === item.id} key={item.id} onClick={() => setSelected(item.id)}>
            <span>{item.name}</span><small>{item.reference}</small>
          </button>
        ))}
        <button className="payment-choice payment-choice-practice" type="button" role="radio" aria-checked={isPractice} onClick={() => setSelected("practice")}>
          <span>Practice QR</span><small>Test only</small>
        </button>
      </div>
      <div className="payment-qr" key={selected}>
        {terminal ? (
          <Image src={terminal.image} alt={`${terminal.name} payment QR`} width={terminal.image.width} height={terminal.image.height} />
        ) : isPractice ? (
          <Image src={practiceQr} alt="Practice payment QR, not for event registration" width={practiceQr.width} height={practiceQr.height} />
        ) : paymentQr ? (
          <Image src={paymentQr} alt={`UPI payment QR for ${upiId}`} width={224} height={224} unoptimized />
        ) : null}
        <span>{isPractice ? "Practice only · do not use for event registration" : terminal ? `${terminal.name} · verify the payee shown in your UPI app` : `Pay to ${upiId}`}</span>
        {isPractice ? (
          <p className="payment-practice-note" role="status">This QR is for testing only. Do not use it to pay your registration fee.</p>
        ) : selected === "upi" ? (
          <>
            <a className="text-link" href={paymentUri}>Open UPI app <span aria-hidden="true">↗</span></a>
            <button className="payment-copy" type="button" onClick={copyUpiId}>
              {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              {copied ? "Copied" : "Copy UPI ID"}
            </button>
          </>
        ) : null}
      </div>
      <p className="payment-safety">Before approving, check the payee and amount in your UPI app. Terminal QRs may identify a specific merchant terminal.</p>
    </>
  );
}