// Kolom kiri: Jadwal Sholat.
// Props: prayerTimes [{id,name,time,iqomah,isNextPrayer,isPassed}], theme, hasSchedule.
export default function PrayerSchedule({ prayerTimes, theme, hasSchedule }) {
  return (
    <section
      aria-label="Jadwal Sholat"
      className="flex min-h-0 flex-col rounded-[1vw] border border-line bg-card/85 p-[1.1vw] shadow-[0_1.2vh_2.5vh_rgba(0,0,0,0.25)]"
    >
      <h2 className="flex shrink-0 items-center justify-between text-[clamp(0.8rem,1.05vw,1.15rem)] font-extrabold tracking-[0.18em] text-gold">
        <span>JADWAL SHOLAT</span>
        <span aria-hidden="true" className="text-gold/70">→</span>
      </h2>

      {!hasSchedule ? (
        <p className="mt-[1.5vh] text-[clamp(0.75rem,0.95vw,1.05rem)] leading-relaxed text-cream">
          Jadwal sholat belum tersedia — isi koordinat masjid di Admin agar jadwal tampil.
        </p>
      ) : (
        <div className="mt-[1vh] flex min-h-0 flex-1 flex-col gap-[0.7vh]">
          {prayerTimes.map((p) => {
            const next = p.isNextPrayer;
            const passed = p.isPassed && !next;
            // Perbaikan kontras terang (terukur 5,90:1): baris passed di tema
            // terang dibuat lebih tegas (opacity .8 + teks gelap), tema gelap
            // tetap redup seperti sebelumnya.
            const passedCls = passed ? (theme === "terang" ? "opacity-80" : "opacity-55") : "";
            const textCls = passed && theme === "terang" ? "text-ink" : "text-cream";
            return (
              <div
                key={p.id}
                className={[
                  "flex min-h-0 flex-1 items-center justify-between rounded-[0.6vw] border px-[1vw]",
                  next
                    ? "border-gold bg-gold/15 shadow-[0_0_0_1px_var(--gold),0_0_2.5vh_rgba(212,175,55,0.25)]"
                    : "border-linesoft bg-bg/40",
                  passedCls,
                ].join(" ")}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-[0.5vw]">
                    <span
                      className={[
                        "text-[clamp(0.95rem,1.45vw,1.65rem)] font-extrabold leading-tight",
                        next ? "text-goldsoft" : "text-ink",
                      ].join(" ")}
                    >
                      {p.name}
                    </span>
                    {next && (
                      <span className="rounded-full bg-gold px-[0.55em] py-[0.2em] text-[clamp(0.5rem,0.6vw,0.7rem)] font-extrabold tracking-[0.12em] text-bg">
                        BERIKUTNYA
                      </span>
                    )}
                  </span>
                  <span className={["text-[clamp(0.6rem,0.8vw,0.9rem)]", textCls].join(" ")}>
                    {p.iqomah ? `Iqomah +${p.iqomah} mnt` : p.name === "Jumat" ? "Khutbah" : "—"}
                  </span>
                </span>
                <span
                  className={[
                    "font-sans font-extrabold tabular-nums",
                    "text-[clamp(1.1rem,1.7vw,1.95rem)]",
                    next ? "text-goldsoft" : "text-ink",
                  ].join(" ")}
                >
                  {p.time}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-[1vh] shrink-0 text-[clamp(0.6rem,0.75vw,0.85rem)] leading-snug text-dim">
        Jadwal dihitung dari koordinat masjid, metode Kemenag. Iq. = iqomah.
      </p>
    </section>
  );
}
