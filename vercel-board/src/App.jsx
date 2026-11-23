import { useEffect, useMemo, useRef, useState } from "react";
import { computeBoardState } from "./data.js";
import Header from "./components/Header.jsx";
import PrayerSchedule from "./components/PrayerSchedule.jsx";
import HeroCountdown, { EventMurotal } from "./components/HeroCountdown.jsx";
import FinancePanel from "./components/FinancePanel.jsx";
import SlideStage from "./components/SlideStage.jsx";
import Ticker from "./components/Ticker.jsx";

const API_URL = "/api/board"; // same-origin: function sendiri (api/board.js)
const POLL_MS = 60000; // sinkronisasi ulang tiap 60 detik

function readTheme() {
  try {
    const t = new URLSearchParams(window.location.search).get("tema") || "";
    const ok = { gelap: 1, terang: 1, emas: 1, "biru-malam": 1 };
    return ok[String(t).toLowerCase()] ? String(t).toLowerCase() : "biru-malam";
  } catch {
    return "biru-malam";
  }
}

export default function App() {
  const [theme] = useState(readTheme);
  const [payload, setPayload] = useState(null); // paket terakhir yang berhasil diambil
  const hasPayloadRef = useRef(false); // cermin payload untuk dipakai di dalam interval
  const [sync, setSync] = useState("MEMUAT…");
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Ambil paket tayang; gagal -> tetap tampilkan data terakhir (jangan data palsu).
  useEffect(() => {
    let cancelled = false;
    async function fetchBoard() {
      try {
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (cancelled) return;
        hasPayloadRef.current = true;
        setPayload(data);
        setSync("TERBARU");
      } catch {
        if (cancelled) return;
        setSync(hasPayloadRef.current ? "DATA TERAKHIR" : "TIDAK TERHUBUNG");
      }
    }
    fetchBoard();
    const poll = setInterval(fetchBoard, POLL_MS);
    const tick = setInterval(() => setNow(new Date()), 1000);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Model Board (semua data untuk komponen) — dihitung ulang tiap detik.
  const model = useMemo(() => {
    const m = computeBoardState(payload, now, sync);
    m.systemStatus.networkStatus = online ? "ONLINE" : "OFFLINE";
    if (!payload) {
      // Belum pernah berhasil fetch: jangan tampilkan isi jadwal/kas palsu.
      m.masjidInfo.name = sync === "MEMUAT…" ? "Memuat…" : "Masjid";
      m.nextPrayerCountdown = {
        label: sync === "MEMUAT…" ? "MEMUAT DATA" : "TIDAK TERHUBUNG",
        name: "—",
        countdown: "--:--:--",
        sub:
          sync === "MEMUAT…"
            ? "Mengambil paket tayang dari server…"
            : "Periksa koneksi internet — Board menampilkan data terakhir bila ada.",
        progress: 0,
      };
    }
    return m;
  }, [payload, now, sync, online]);

  return (
    <div
      className={[
        "relative flex h-screen w-screen flex-col overflow-hidden bg-bg font-sans text-ink",
        model.sholatMode ? "mode-sholat" : "",
      ].join(" ")}
    >
      {/* Pola geometris Islami halus di latar */}
      <div className="board-pattern pointer-events-none absolute inset-0" aria-hidden="true" />
      {/* Bingkai tipis emas di tepi layar */}
      <div className="pointer-events-none absolute inset-[1vh] z-20 rounded-[0.8vw] border border-linesoft" aria-hidden="true" />

      <Header masjidInfo={model.masjidInfo} systemStatus={model.systemStatus} dates={model.dates} now={now} />

      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-[1fr_1.35fr_1fr] gap-[1vw] px-[2vw] pb-[1.2vh]">
        <PrayerSchedule prayerTimes={model.prayerTimes} theme={theme} hasSchedule={model.hasSchedule} />

        <div className="flex min-h-0 flex-col gap-[1vw]">
          <HeroCountdown countdown={model.nextPrayerCountdown} sholatMode={model.sholatMode} />
          <EventMurotal upcomingEvent={model.upcomingEvent} murotalConfig={model.murotalConfig} />
        </div>

        <FinancePanel financeData={model.financeData} qrisItems={model.qrisItems} />
      </main>

      {/* Strip slide berotasi: kajian berikutnya + petugas Jumat. */}
      <SlideStage kajian={model.kajianBerikutnya} petugasJumat={model.petugasJumat} sholatMode={model.sholatMode} />

      <Ticker announcements={model.announcements} />

      {/* Mode sholat: layar meredup (hero sudah menampilkan statusnya). */}
      {model.sholatMode && (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-black/25"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
