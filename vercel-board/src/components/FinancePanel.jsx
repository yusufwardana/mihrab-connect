import { fmtRp } from "../data.js";
import { QrIcon } from "./icons.jsx";

// Kolom kanan: ringkasan kas + area QRIS/donasi.
export default function FinancePanel({ financeData, qrisItems }) {
  const cats = financeData.categories || [];
  return (
    <section
      aria-label="Kas dan informasi masjid"
      className="flex min-h-0 flex-col rounded-[1vw] border border-line bg-card/85 p-[1.1vw] shadow-[0_1.2vh_2.5vh_rgba(0,0,0,0.25)]"
    >
      <h2 className="flex shrink-0 items-center justify-between text-[clamp(0.8rem,1.05vw,1.15rem)] font-extrabold tracking-[0.18em] text-gold">
        <span>KAS &amp; INFO MASJID</span>
        <span aria-hidden="true" className="text-gold/70">→</span>
      </h2>

      {/* Ringkasan kas */}
      <div className="mt-[1vh] flex shrink-0 flex-col gap-[0.7vh]">
        {cats.length === 0 && (
          <div className="flex items-center justify-between rounded-[0.6vw] border border-linesoft bg-bg/40 px-[1vw] py-[1vh]">
            <span className="text-[clamp(0.85rem,1.1vw,1.2rem)] text-ink">Belum ada kategori kas</span>
            <b className="font-sans text-[clamp(0.85rem,1.1vw,1.2rem)] font-extrabold tabular-nums text-ink">Rp —</b>
          </div>
        )}
        {cats.map((k) => (
          <div
            key={k.id}
            className="flex items-center justify-between rounded-[0.6vw] border border-linesoft bg-bg/40 px-[1vw] py-[1vh]"
          >
            <span className="text-[clamp(0.85rem,1.1vw,1.2rem)] text-ink">{k.name}</span>
            <b className="font-sans text-[clamp(0.85rem,1.1vw,1.2rem)] font-extrabold tabular-nums text-ink">
              {fmtRp(k.saldo)}
            </b>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-[0.6vw] border border-gold bg-gold/15 px-[1vw] py-[1vh] shadow-[0_0_0_1px_var(--gold)]">
          <span className="text-[clamp(0.85rem,1.1vw,1.2rem)] font-extrabold text-goldsoft">Total Saldo</span>
          <b className="font-sans text-[clamp(0.95rem,1.25vw,1.35rem)] font-extrabold tabular-nums text-goldsoft">
            {fmtRp(financeData.total)}
          </b>
        </div>
      </div>
      <p className="mt-[0.8vh] shrink-0 text-[clamp(0.55rem,0.68vw,0.78rem)] leading-snug text-dim">
        Ringkasan saja, bukan detail transaksi. Angka dari Finance setelah disetujui; “Rp —” berarti kategori belum
        punya transaksi.
      </p>

      {/* Area QRIS — maksimal 3 slot */}
      <div className="mt-[1.2vh] grid min-h-0 flex-1 grid-cols-3 gap-[0.8vw]">
        {qrisItems.length === 0 && <QrisSlot kategori="" qrImageUrl={null} />}
        {qrisItems.map((q) => (
          <QrisSlot key={q.kategori} kategori={q.kategori} qrImageUrl={q.qrImageUrl} />
        ))}
      </div>
    </section>
  );
}

function QrisSlot({ kategori, qrImageUrl }) {
  return (
    <div className="flex min-h-0 flex-col items-center">
      <div className="flex w-full flex-1 items-center justify-center overflow-hidden rounded-[0.6vw] border border-linesoft bg-white p-[0.4vw]">
        {qrImageUrl ? (
          <img src={qrImageUrl} alt={"QRIS " + kategori} className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-[0.4vh] px-[0.3vw] text-center text-[#9AA5A0]">
            <QrIcon className="h-[clamp(1.6rem,2.6vw,2.9rem)] w-auto opacity-50" />
            <span className="text-[clamp(0.55rem,0.68vw,0.78rem)] font-bold leading-tight">QRIS belum tersedia</span>
          </span>
        )}
      </div>
      <p className="mt-[0.5vh] text-center text-[clamp(0.6rem,0.75vw,0.85rem)] font-bold leading-tight text-cream">
        {kategori ? kategori.toUpperCase() : ""}
        <small className="block text-[0.85em] font-semibold tracking-[0.2em] text-dim">QRIS</small>
      </p>
    </div>
  );
}
