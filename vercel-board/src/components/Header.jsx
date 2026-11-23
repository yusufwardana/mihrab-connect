import DomeIcon from "./icons.jsx";

function Badge({ label, value, live, tone }) {
  return (
    <span className="inline-flex items-center gap-[0.45em] rounded-full border border-linesoft bg-card/60 px-[0.8em] py-[0.35em] text-[clamp(0.6rem,0.72vw,0.85rem)] font-bold tracking-[0.08em] text-cream">
      {live && <span className="inline-block h-[0.55em] w-[0.55em] rounded-full bg-gold animate-pulse-dot" aria-hidden="true" />}
      <span className="opacity-80">{label}</span>
      <b className={tone === "gold" ? "text-goldsoft" : "text-ink"}>{value}</b>
    </span>
  );
}

// Header: kiri brand + badges, tengah nama masjid, kanan jam real-time.
export default function Header({ masjidInfo, systemStatus, dates, now }) {
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const clock = pad(now.getHours()) + ":" + pad(now.getMinutes());
  const seconds = ":" + pad(now.getSeconds());

  return (
    <header className="relative z-10 grid shrink-0 grid-cols-[1fr_auto_1fr] items-start gap-[1.2vw] px-[2vw] pt-[1.6vh] pb-[1vh]">
      {/* Kiri: logo + brand + badges */}
      <div className="flex min-w-0 items-start gap-[0.9vw]">
        <DomeIcon className="mt-[0.2vh] h-[clamp(2.4rem,3.6vw,3.9rem)] w-auto shrink-0 text-gold" />
        <div className="min-w-0">
          <div className="text-[clamp(0.85rem,1.15vw,1.3rem)] font-extrabold leading-tight tracking-[0.22em] text-ink">
            MIHRAB CONNECT
          </div>
          <div className="text-[clamp(0.6rem,0.8vw,0.9rem)] font-bold tracking-[0.55em] text-gold">BOARD</div>
          <div className="mt-[0.9vh] flex flex-wrap gap-[0.45vw]">
            <Badge label="MODE" value={systemStatus.mode} live />
            <Badge label="MUROTAL" value={systemStatus.murotalStatus} />
            <Badge label="DATA" value={systemStatus.syncStatus} tone="gold" />
            <Badge label="JARINGAN" value={systemStatus.networkStatus} />
          </div>
        </div>
      </div>

      {/* Tengah: nama masjid + alamat */}
      <div className="max-w-[44vw] text-center">
        <h1 className="font-serif text-[clamp(1.5rem,2.5vw,2.9rem)] font-semibold leading-[1.05] tracking-wide text-gold">
          {masjidInfo.name}
        </h1>
        {/* Ornamen pembatas emas */}
        <div className="mx-auto mt-[0.7vh] flex items-center justify-center gap-[0.6vw] text-gold" aria-hidden="true">
          <span className="h-px w-[4vw] bg-gold/60" />
          <span className="inline-block h-[0.5vw] w-[0.5vw] rotate-45 bg-gold" />
          <span className="inline-block h-[0.35vw] w-[0.35vw] rotate-45 bg-gold/60" />
          <span className="inline-block h-[0.5vw] w-[0.5vw] rotate-45 bg-gold" />
          <span className="h-px w-[4vw] bg-gold/60" />
        </div>
        <p className="mt-[0.6vh] truncate text-[clamp(0.7rem,0.95vw,1.05rem)] text-cream">{masjidInfo.address}</p>
      </div>

      {/* Kanan: jam + tanggal */}
      <div className="text-right">
        <div className="font-sans text-[clamp(1.9rem,3.4vw,3.8rem)] font-extrabold leading-none tabular-nums tracking-tight text-ink">
          {clock}
          <span className="text-gold">{seconds}</span>
        </div>
        <div className="mt-[0.5vh] text-[clamp(0.7rem,0.95vw,1.05rem)] font-semibold text-ink">{dates.masehi}</div>
        <div className="text-[clamp(0.65rem,0.85vw,0.95rem)] text-cream">
          <span aria-hidden="true">☾ </span>
          {dates.hijriyah}
        </div>
      </div>
    </header>
  );
}
