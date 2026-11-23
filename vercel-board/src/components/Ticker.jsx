// Footer: banner pengumuman dengan teks berjalan (marquee).
export default function Ticker({ announcements }) {
  const items = announcements && announcements.length ? announcements : ["Mihrab Connect Board"];
  const text = items.join("  •  ");
  return (
    <footer className="relative z-10 flex h-[5.5vh] shrink-0 items-center gap-[1vw] overflow-hidden border-t border-line bg-bg2/90 px-[2vw]">
      <span className="shrink-0 rounded-[0.4vw] bg-gold px-[0.9vw] py-[0.5vh] text-[clamp(0.65rem,0.85vw,0.95rem)] font-extrabold tracking-[0.18em] text-bg">
        PENGUMUMAN
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden" aria-label="Pengumuman">
        <div className="animate-marquee flex w-max whitespace-nowrap">
          <span className="pr-[3vw] text-[clamp(0.8rem,1.05vw,1.15rem)] font-semibold text-ink">{text}</span>
          <span className="pr-[3vw] text-[clamp(0.8rem,1.05vw,1.15rem)] font-semibold text-ink" aria-hidden="true">
            {text}
          </span>
        </div>
      </div>
    </footer>
  );
}
