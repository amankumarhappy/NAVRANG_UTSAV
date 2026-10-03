import Image from "next/image";
import type { StaticImageData } from "next/image";

export function PosterArt({ poster, className = "" }: { poster: { src: StaticImageData; alt: string; label: string }; className?: string }) {
  return (
    <figure className={`poster-art ${className}`}>
      <Image src={poster.src} alt={poster.alt} fill sizes="(max-width: 760px) 90vw, 45vw" priority />
      <figcaption>{poster.label}<span>·</span> NAVRANG UTSAV 2026</figcaption>
    </figure>
  );
}
