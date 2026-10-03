"use client";

import { useEffect, useState } from "react";
import { eventConfig } from "@/config/event";

const eventStartTime = new Date(eventConfig.startsAt).getTime();

function getRemainingTime(now: number) {
  const millisecondsRemaining = Math.max(0, eventStartTime - now);
  const totalSeconds = Math.ceil(millisecondsRemaining / 1000);
  return {
    complete: millisecondsRemaining === 0,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

const timeUnits = [
  ["days", "Days"],
  ["hours", "Hours"],
  ["minutes", "Minutes"],
  ["seconds", "Seconds"],
] as const;

export function EventCountdown() {
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemainingTime> | null>(null);

  useEffect(() => {
    const update = () => setRemaining(getRemainingTime(Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="event-countdown" aria-label="Countdown to NAVRANG 26">
      {remaining?.complete ? (
        <div className="countdown-complete" role="status">
          <h2>The celebration is here!</h2>
          <p>Detailed schedule will be published soon.</p>
        </div>
      ) : (
        <>
          <h2 className="countdown-heading">The celebration begins in</h2>
          <div className="countdown-units" aria-label={remaining
            ? `${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes and ${remaining.seconds} seconds`
            : "Countdown loading"}>
            {timeUnits.map(([unit, label]) => (
              <div className="countdown-unit" key={unit}>
                <span className="countdown-value">{remaining ? String(remaining[unit]).padStart(2, "0") : "--"}</span>
                <span className="countdown-label">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
