import { MihrabArch } from "./icons.jsx";

// Kolom tengah atas (65%): hitung mundur menuju adzan berikutnya.
export default function HeroCountdown({ countdown, sholatMode }) {
  return (
    <section
      aria-label="Hitung mundur adzan"
      className={[
        "relative flex min-h-0 flex-[65] flex-col items-center justify-center overflow-hidden rounded-[1vw] border border-line bg-card/85 px-[1vw] text-center",
        "shadow-[0_1.2vh_2.5vh_rgba(0,0,0,0.25)]",
        sholatMode ? "opacity-90" : "",
      ].join(" ")}
    >
      {/* Siluet kubah/mihrab tipis di belakang konten */}
      <MihrabArch className="pointer-events-none absolute bottom-0 left-1/2 h-[92%] w-auto -translate-x-1/2 text-gold opacity-[0.16]" />
      {/* Pola geometris halus khusus kartu hero */}
      <div className="board-pattern pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 flex min-h-0 w-full flex-col items-center justify-center">
        <div className="text-[clamp(0.75rem,1.05vw,1.2rem)] font-extrabold tracking-[0.35em] text-gold">
          {countdown.label}
        </div>
        <div className="mt-[0.5vh] font-serif text-[clamp(1.8rem,3.2vw,3.6rem)] font-semibold leading-none tracking-wide text-ink">
          {countdown.name}
        </div>
        <div className="mt-[0.8vh] font-sans text-[clamp(3.2rem,7.2vw,8.2rem)] font-extrabold leading-none tabular-nums tracking-tight text-ink drop-shadow-[0_0.4vh_1.2vh_rgba(0,0,0,0.35)]">
          {countdown.countdown}
        </div>
        <p className="mt-[1vh] max-w-[90%] text-[clamp(0.7rem,0.95vw,1.1rem)] leading-snug text-cream">
          {countdown.sub}
        </p>
        {/* Progress menuju adzan */}
        <div className="mt-[1.4vh] h-[0.6vh] w-[62%] overflow-hidden rounded-full bg-linesoft">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-1000 ease-linear"
            style={{ width: countdown.progress + "%" }}
          />
        </div>
      </div>
    </section>
  );
}

// Kolom tengah bawah (35%): countdown hari besar + status murotal.
export function EventMurotal({ upcomingEvent, murotalConfig }) {
  return (
    <div className="grid min-h-0 flex-[35] grid-cols-2 gap-[1vw]">
      <section
        aria-label="Countdown hari besar"
        className="flex min-h-0 flex-col justify-center rounded-[1vw] border border-line bg-card/85 p-[1vw]"
      >
        <h3 className="text-[clamp(0.65rem,0.85vw,0.95rem)] font-extrabold tracking-[0.18em] text-gold">
          COUNTDOWN HARI BESAR
        </h3>
        {upcomingEvent ? (
          <>
            <div className="mt-[0.6vh] font-serif text-[clamp(1.05rem,1.6vw,1.8rem)] font-semibold leading-tight text-ink">
              {upcomingEvent.eventName}
            </div>
            <div className="font-sans text-[clamp(1.5rem,2.4vw,2.7rem)] font-extrabold leading-none tabular-nums text-goldsoft">
              {upcomingEvent.daysRemaining}
            </div>
            <p className="mt-[0.5vh] text-[clamp(0.65rem,0.85vw,0.95rem)] text-cream">{upcomingEvent.eventDate}</p>
          </>
        ) : (
          <p className="mt-[0.6vh] text-[clamp(0.7rem,0.95vw,1.05rem)] text-cream">Belum ada event yang dijadwalkan.</p>
        )}
      </section>

      <section
        aria-label="Murotal otomatis"
        className="flex min-h-0 flex-col justify-center rounded-[1vw] border border-line bg-card/85 p-[1vw]"
      >
        <h3 className="text-[clamp(0.65rem,0.85vw,0.95rem)] font-extrabold tracking-[0.18em] text-gold">
          MUROTAL OTOMATIS
        </h3>
        <div className="mt-[0.6vh] flex items-center gap-[0.5vw]">
          <span
            className={[
              "inline-block h-[0.7em] w-[0.7em] rounded-full",
              murotalConfig.state === "on" ? "bg-gold animate-pulse-dot" : "bg-gold/50",
            ].join(" ")}
            aria-hidden="true"
          />
          <span className="text-[clamp(0.95rem,1.4vw,1.55rem)] font-extrabold tracking-wide text-ink">
            {murotalConfig.stateText}
          </span>
        </div>
        <p className="mt-[0.5vh] text-[clamp(0.65rem,0.85vw,0.95rem)] leading-snug text-cream">{murotalConfig.desc}</p>
      </section>
    </div>
  );
}
