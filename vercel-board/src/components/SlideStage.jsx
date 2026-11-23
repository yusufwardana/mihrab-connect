import { useEffect, useState } from "react";

// Strip slide berotasi di bawah kolom utama (pola Board vanilla lama):
// rotasi otomatis 9 detik + dot indikator, jeda saat mode sholat.
// Slide kajian hanya ada bila ada kajian tayang (bila kosong, slide +
// dot-nya hilang); slide petugas Jumat selalu ada — bila belum ada data
// petugas, tampil empty state jujur, bukan nama palsu.
// Penempatan strip (bukan kolom ke-4) supaya jadwal, hero countdown,
// kas/QRIS, dan ticker tetap utuh dalam 16:9 tanpa scroll.
const ROTASI_MS = 9000;

function Tag({ children }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[0.35vw] border border-gold/50 bg-gold/15 px-[0.7em] py-[0.25em] text-[clamp(0.6rem,0.75vw,0.85rem)] font-extrabold tracking-[0.18em] text-goldsoft">
      {children}
    </span>
  );
}

function KajianSlide({ kajian }) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-[0.5vh] pr-[4.5vw]">
      <Tag>KAJIAN BERIKUTNYA</Tag>
      <h3 className="truncate font-serif text-[clamp(1.15rem,2vw,2.1rem)] font-semibold leading-tight tracking-wide text-ink">
        {kajian.title}
      </h3>
      <p className="truncate text-[clamp(0.7rem,0.95vw,1.05rem)] text-cream">
        {kajian.meta}
        {kajian.text ? "  ·  " + kajian.text : ""}
      </p>
    </div>
  );
}

function PetugasItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[clamp(0.6rem,0.75vw,0.85rem)] font-bold tracking-[0.14em] text-dim">{label}</div>
      <div className="mt-[0.3vh] truncate font-sans text-[clamp(0.9rem,1.25vw,1.4rem)] font-extrabold tabular-nums leading-tight text-ink">
        {value || "—"}
      </div>
    </div>
  );
}

function PetugasSlide({ petugas }) {
  if (!petugas) {
    return (
      <div className="flex min-w-0 flex-col justify-center gap-[0.4vh] pr-[4.5vw]">
        <Tag>PETUGAS JUMAT</Tag>
        <p className="text-[clamp(0.95rem,1.35vw,1.5rem)] font-extrabold text-ink">Belum ada petugas Jumat</p>
        <p className="text-[clamp(0.65rem,0.85vw,0.95rem)] text-cream">
          Tambahkan petugas di Admin — Jadwal.
        </p>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col justify-center gap-[0.6vh] pr-[4.5vw]">
      <div className="flex flex-wrap items-center gap-[0.8vw]">
        <Tag>PETUGAS JUMAT</Tag>
        <span className="text-[clamp(0.7rem,0.95vw,1.05rem)] font-semibold text-cream">{petugas.dateLabel}</span>
      </div>
      <div className="grid grid-cols-4 gap-[1vw]">
        <PetugasItem label="KHUTBAH MULAI" value={petugas.khutbahMulai ? petugas.khutbahMulai + " WIB" : null} />
        <PetugasItem label="KHATIB" value={petugas.khatib} />
        <PetugasItem label="IMAM" value={petugas.imam} />
        <PetugasItem label="MUADZIN" value={petugas.muadzin} />
      </div>
    </div>
  );
}

export default function SlideStage({ kajian, petugasJumat, sholatMode }) {
  const slides = [];
  if (kajian) slides.push({ id: "kajian" });
  slides.push({ id: "petugas" });
  const [idx, setIdx] = useState(0);

  // Jaga indeks tetap valid bila jumlah slide berubah (kajian muncul/hilang).
  useEffect(() => {
    setIdx((i) => (slides.length ? i % slides.length : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  // Rotasi otomatis; jeda saat mode sholat (pola lama) dan bila cuma 1 slide.
  useEffect(() => {
    if (sholatMode || slides.length <= 1) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), ROTASI_MS);
    return () => clearInterval(t);
  }, [sholatMode, slides.length]);

  const activeIdx = slides.length ? idx % slides.length : 0;

  return (
    <section
      aria-label="Slide info masjid"
      className="relative z-10 mx-[2vw] mb-[1.2vh] flex h-[clamp(96px,13.5vh,152px)] shrink-0 overflow-hidden rounded-[1vw] border border-line bg-card/85 shadow-[0_1.2vh_2.5vh_rgba(0,0,0,0.25)]"
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          data-slide={s.id}
          aria-hidden={i !== activeIdx}
          className={[
            "absolute inset-0 flex flex-col justify-center px-[1.2vw] transition-opacity duration-700",
            i === activeIdx ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
        >
          {s.id === "kajian" ? <KajianSlide kajian={kajian} /> : <PetugasSlide petugas={petugasJumat} />}
        </div>
      ))}

      {/* Dot indikator (pola lama): satu dot per slide yang tampil. */}
      <div className="absolute right-[1.2vw] top-1/2 z-10 flex -translate-y-1/2 gap-[0.45vw]" aria-hidden="true">
        {slides.map((s, i) => (
          <i
            key={s.id}
            className={[
              "inline-block h-[0.55vw] min-h-[7px] rounded-full transition-all duration-500",
              i === activeIdx ? "w-[1.1vw] min-w-[14px] bg-gold" : "w-[0.55vw] min-w-[7px] bg-cream/40",
            ].join(" ")}
          />
        ))}
      </div>
    </section>
  );
}
