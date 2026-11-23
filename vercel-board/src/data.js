// ============================================================================
// DATA BOARD — satu tempat untuk seluruh data yang dirender.
// Bentuknya mengikuti persis payload GET /api/board (lihat api/board.js).
// ----------------------------------------------------------------------------
// MOCK_PAYLOAD di bawah ini HANYA referensi bentuk + fixture lokal: isinya
// snapshot nilai asli yang sedang live (jadwal Wonogiri, event Ramadan,
// murotal). Kas tetap null dan QRIS tetap null karena di database memang
// kosong — JANGAN isi angka dari mockup. Render live TIDAK PERNAH memakai
// objek ini: App selalu fetch /api/board, dan sebelum fetch berhasil
// tampil "Memuat…" / "TIDAK TERHUBUNG", bukan data mock.
// ============================================================================

export const MOCK_PAYLOAD = {
  masjid: {
    nama: "Masjid Jami' Abdul Latief Al Furqon",
    alamat: "Ploso, Mlopoharjo, Wuryantoro, Wonogiri 57661",
    koordinat_lat: -7.89367,
    koordinat_lng: 110.84866,
    logo_url: null,
    foto_url: null,
    kontak: null,
  },
  jadwal: {
    metode: "Kemenag",
    koreksi_menit: 0,
    offset_hijriyah: 0,
    waktu: [
      { nama: "Subuh", jam: "03:46", iqomah: 10 },
      { nama: "Terbit", jam: "05:08", iqomah: null },
      { nama: "Dzuhur", jam: "11:25", iqomah: 10 },
      { nama: "Ashar", jam: "14:48", iqomah: 10 },
      { nama: "Maghrib", jam: "17:40", iqomah: 10 },
      { nama: "Isya", jam: "18:55", iqomah: 10 },
    ],
  },
  pengumuman_tayang: [],
  ringkasan_kas: {
    per_kategori: [
      { id: "mock-1", nama: "Pembangunan", saldo: null },
      { id: "mock-2", nama: "TPQ", saldo: null },
      { id: "mock-3", nama: "Infaq Umum", saldo: null },
    ],
    total: 0,
  },
  qris: [
    { kategori: "Pembangunan", qris_url: null },
    { kategori: "TPQ", qris_url: null },
    { kategori: "Infaq Umum", qris_url: null },
  ],
  event: [{ id: "mock-ev", nama: "Ramadan 1448 H", tanggal: "2027-02-18" }],
  countdown_berikutnya: { id: "mock-ev", nama: "Ramadan 1448 H", tanggal: "2027-02-18" },
  kajian: [],
  petugas_jumat: null,
  murotal: { surah: "Ar-Rahman", qari: "Contoh Qari", durasi_menit: 30, volume: 70, aktif: true },
  tanggal: { masehi: "Senin, 23 November 2026", hijriyah: "12 Jumadilakhir 1448 H" },
};

// ---------- Util (port dari Board vanilla lama) ----------
export function pad(n) {
  return (n < 10 ? "0" : "") + n;
}
export function fmtClock(d) {
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}
export function fmtDur(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
}
export function fmtRp(n) {
  if (n === null || n === undefined) return "Rp —";
  try {
    return "Rp " + Number(n).toLocaleString("id-ID");
  } catch {
    return "Rp " + n;
  }
}
export function fmtTanggalId(d) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toDateString();
  }
}
function atTime(base, hm) {
  const p = String(hm).split(":");
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), +p[0], +p[1], 0, 0);
}

const SHOLAT_MINUTES = 12; // durasi tampilan mode sholat setelah iqomah
const MUROTAL_BEFORE = 10; // jendela murotal: 10 menit sebelum adzan
const KHUTBAH_MINUTES = 45; // durasi tampilan mode Jumat

// ---------- Model Board: payload + jam sekarang -> semua yang dirender ----------
// Dipakai App lewat useMemo tiap detik; komponen hanya menerima props.
export function computeBoardState(payload, now, syncStatus) {
  const isFriday = now.getDay() === 5;
  const m = (payload && payload.masjid) || {};

  const model = {
    masjidInfo: { name: m.nama || "Masjid", address: m.alamat || "" },
    dates: {
      masehi: (payload && payload.tanggal && payload.tanggal.masehi) || "—",
      hijriyah: (payload && payload.tanggal && payload.tanggal.hijriyah) || "—",
    },
    systemStatus: { mode: "TANPA JADWAL", murotalStatus: "SIAGA", syncStatus, networkStatus: "OFFLINE" },
    hasSchedule: false,
    prayerTimes: [],
    nextPrayerCountdown: null,
    upcomingEvent: null,
    murotalConfig: { state: "idle", stateText: "SIAGA", desc: "Murotal menunggu jadwal sholat." },
    financeData: { categories: [], total: null, allNull: true },
    qrisItems: [],
    announcements: [],
    kajianBerikutnya: null,
    petugasJumat: null,
    friday: isFriday,
    sholatMode: false,
  };

  // Kas + QRIS + pengumuman: tetap dihitung walau jadwal belum ada.
  const rk = (payload && payload.ringkasan_kas) || {};
  const cats = rk.per_kategori || [];
  let allNull = cats.length > 0;
  cats.forEach((k) => {
    if (k.saldo !== null && k.saldo !== undefined) allNull = false;
  });
  model.financeData = {
    categories: cats.map((k) => ({ id: k.id, name: k.nama, saldo: k.saldo ?? null })),
    total: cats.length && !allNull ? rk.total : null,
    allNull,
  };
  model.qrisItems = ((payload && payload.qris) || []).slice(0, 3).map((q) => ({
    kategori: q.kategori,
    qrImageUrl: q.qris_url || null,
  }));
  const tayang = (payload && payload.pengumuman_tayang) || [];
  model.announcements = tayang.length
    ? tayang.map((p) => p.isi)
    : ["Mihrab Connect Board — " + (m.nama || "Masjid")];

  // Slide kajian berikutnya: kajian tayang pertama (payload sudah difilter
  // status tayang + tanggal >= hari ini, urut tanggal). Null bila kosong —
  // slide + dot-nya ikut hilang (pola Board vanilla lama).
  const daftarKajian = (payload && payload.kajian) || [];
  if (daftarKajian.length) {
    const k = daftarKajian[0];
    const parts = String(k.tanggal).split("-");
    const tgl = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    model.kajianBerikutnya = {
      title: k.judul,
      meta: fmtTanggalId(tgl) + (k.waktu ? " · Pukul " + k.waktu + " WIB" : ""),
      text:
        (k.pemateri ? "Pemateri: " + k.pemateri : "") +
        (daftarKajian.length > 1
          ? (k.pemateri ? " · " : "") + "+" + (daftarKajian.length - 1) + " kajian lagi"
          : ""),
    };
  } else {
    model.kajianBerikutnya = null;
  }

  // Slide petugas Jumat terdekat (dari payload.petugas_jumat). Null bila
  // belum ada data petugas sama sekali — slide menampilkan empty state.
  const pj = payload ? payload.petugas_jumat : null;
  if (pj) {
    const parts = String(pj.tanggal).split("-");
    const tgl = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    model.petugasJumat = {
      dateLabel: fmtTanggalId(tgl),
      khutbahMulai: pj.khutbah_mulai || null,
      khatib: pj.khatib || null,
      imam: pj.imam || null,
      muadzin: pj.muadzin || null,
    };
  } else {
    model.petugasJumat = null;
  }

  // Jadwal (null bila koordinat masjid belum diisi -> jangan tampilkan jam palsu).
  const waktu = (payload && payload.jadwal && payload.jadwal.waktu) || null;
  if (!waktu || !waktu.length) {
    model.nextPrayerCountdown = {
      label: "JADWAL SHOLAT",
      name: "Jadwal belum tersedia",
      countdown: "--:--:--",
      sub: "Isi koordinat masjid di Admin agar jadwal sholat tampil di Board.",
      progress: 0,
    };
    return model;
  }
  model.hasSchedule = true;

  const prayers = waktu.map((w) => ({
    id: String(w.nama).toLowerCase(),
    name: w.nama,
    time: w.jam,
    iqomah: w.iqomah === null || w.iqomah === undefined ? null : w.iqomah,
  }));

  // Jumat: Dzuhur menjadi Jumat, tanpa iqomah.
  const rows = prayers.map((p) => {
    const t = atTime(now, p.time);
    let name = p.name;
    let iq = p.iqomah;
    if (isFriday && p.id === "dzuhur") {
      name = "Jumat";
      iq = null;
    }
    return { id: p.id, name, time: t, iqomah: iq, raw: p };
  });

  // Fase: menuju adzan / menuju iqomah / sholat / khutbah jumat.
  let phase = "adzan";
  let focus = null;
  let prev = null;
  for (const r of rows) {
    if (r.time.getTime() > now.getTime()) {
      focus = r;
      break;
    }
    prev = r;
  }
  if (!focus) {
    const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    focus = { id: "subuh", name: "Subuh", time: atTime(tmr, prayers[0].time), iqomah: prayers[0].iqomah, raw: prayers[0] };
  }
  let inPrayer = null;
  if (prev && prev.iqomah) {
    const iqTime = new Date(prev.time.getTime() + prev.iqomah * 60000);
    const endTime = new Date(iqTime.getTime() + SHOLAT_MINUTES * 60000);
    if (now.getTime() < iqTime.getTime()) {
      phase = "iqomah";
      focus = prev;
    } else if (now.getTime() < endTime.getTime()) {
      phase = "sholat";
      inPrayer = prev;
    }
  }
  const dzLive = rows[2];
  let fridayKhutbah = false;
  if (isFriday && dzLive) {
    const khutbahEnd = new Date(dzLive.time.getTime() + KHUTBAH_MINUTES * 60000);
    if (now.getTime() >= dzLive.time.getTime() && now.getTime() < khutbahEnd.getTime()) {
      fridayKhutbah = true;
      phase = "khutbah";
    }
  }

  // Baris jadwal + sorot sholat berikutnya.
  const highlightId = phase === "adzan" ? focus.id : inPrayer ? inPrayer.id : focus.id;
  model.prayerTimes = rows.map((r) => ({
    id: r.id,
    name: r.name,
    time: fmtClock(r.time),
    iqomah: r.iqomah,
    isNextPrayer: r.id === highlightId,
    isPassed: r.time.getTime() <= now.getTime() && !(phase !== "adzan" && focus && r.id === focus.id),
  }));

  // Hero hitung mundur.
  let modeText = "NORMAL";
  let hero;
  if (phase === "khutbah") {
    modeText = "JUMAT — KHUTBAH";
    hero = {
      label: "SHOLAT JUMAT SEDANG BERLANGSUNG",
      name: "Khutbah Jumat",
      countdown: fmtClock(now),
      sub: "Hitung mundur iqomah mati pada mode Jumat. Layar menampilkan informasi khutbah dan petugas.",
      progress: 100,
    };
  } else if (phase === "sholat") {
    modeText = "SHOLAT";
    const endT = new Date(inPrayer.time.getTime() + (inPrayer.iqomah + SHOLAT_MINUTES) * 60000);
    hero = {
      label: "SEDANG BERLANGSUNG",
      name: "Sholat " + inPrayer.name,
      countdown: fmtDur(endT.getTime() - now.getTime()),
      sub: "Layar meredup selama sholat berlangsung.",
      progress: 100,
    };
    model.sholatMode = true;
  } else if (phase === "iqomah") {
    modeText = "MENUJU IQOMAH";
    const iqT = new Date(focus.time.getTime() + focus.iqomah * 60000);
    const totalIq = focus.iqomah * 60000;
    hero = {
      label: "MENUJU IQOMAH",
      name: focus.name,
      countdown: fmtDur(iqT.getTime() - now.getTime()),
      sub: "Adzan pukul " + fmtClock(focus.time) + " · Iqomah pukul " + fmtClock(iqT) + " — bersiap, rapatkan shaf.",
      progress: Math.max(0, Math.min(100, 100 - ((iqT.getTime() - now.getTime()) / totalIq) * 100)),
    };
  } else {
    const target = focus.time;
    const iqInfo = focus.iqomah
      ? " · Iqomah +" + focus.iqomah + " menit setelah adzan"
      : focus.id === "terbit"
        ? " · Awal waktu syuruq"
        : " · Tanpa hitung mundur iqomah";
    const prevT = prev ? prev.time.getTime() : target.getTime() - 3 * 3600000;
    hero = {
      label: isFriday && focus.id === "dzuhur" ? "MENUJU SHOLAT JUMAT" : "MENUJU ADZAN",
      name: focus.name,
      countdown: fmtDur(target.getTime() - now.getTime()),
      sub: "Adzan pukul " + fmtClock(target) + iqInfo + ".",
      progress: Math.max(0, Math.min(100, ((now.getTime() - prevT) / (target.getTime() - prevT)) * 100)),
    };
    if (isFriday) modeText = "JUMAT";
  }
  model.nextPrayerCountdown = hero;
  model.systemStatus.mode = modeText;

  // Murotal: jendela 10 menit sebelum Subuh & Maghrib (status saja, tanpa audio).
  const mur = payload ? payload.murotal : null;
  const surah = mur && mur.surah ? mur.surah : "Murotal";
  const qari = mur && mur.qari ? " — " + mur.qari : "";
  const subuhP = prayers.find((p) => p.id === "subuh");
  const maghribP = prayers.find((p) => p.id === "maghrib");
  let murState = "idle";
  let murFocus = null;
  if (mur && mur.aktif === false) {
    murState = "off";
  } else if (subuhP && maghribP) {
    const windows = [
      { prayer: "Subuh", at: atTime(now, subuhP.time) },
      { prayer: "Maghrib", at: atTime(now, maghribP.time) },
    ];
    for (const w of windows) {
      const start = w.at.getTime() - MUROTAL_BEFORE * 60000;
      if (now.getTime() >= start && now.getTime() < w.at.getTime()) {
        murState = "on";
        murFocus = w;
      }
    }
    if (murState !== "on") {
      let nextW = null;
      for (const w of windows) {
        const start = w.at.getTime() - MUROTAL_BEFORE * 60000;
        if (start > now.getTime() && (!nextW || start < nextW.start)) nextW = { w, start };
      }
      if (!nextW) {
        const tmr2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const s2 = atTime(tmr2, subuhP.time);
        nextW = { w: { prayer: "Subuh", at: s2 }, start: s2.getTime() - MUROTAL_BEFORE * 60000 };
      }
      murFocus = nextW.w;
      murState = nextW.start - now.getTime() <= 30 * 60000 ? "soon" : "idle";
      murFocus.startAt = nextW.start;
    }
  }
  if (murState === "on") {
    model.murotalConfig = {
      state: "on",
      stateText: "SEDANG DIPUTAR",
      desc: surah + qari + " menjelang " + murFocus.prayer + " pukul " + fmtClock(murFocus.at) + ". Volume menurun otomatis saat adzan dan berhenti saat iqomah. Status saja — Board tidak memutar audio asli.",
    };
    model.systemStatus.murotalStatus = "DIPUTAR";
  } else if (murState === "off") {
    model.murotalConfig = { state: "off", stateText: "NONAKTIF", desc: "Murotal belum diaktifkan di Admin." };
    model.systemStatus.murotalStatus = "NONAKTIF";
  } else {
    const soon = murState === "soon";
    model.murotalConfig = {
      state: soon ? "soon" : "idle",
      stateText: soon ? "BERSIAP" : "SIAGA",
      desc: murFocus
        ? "Mulai otomatis 10 menit sebelum " + murFocus.prayer + " — pukul " + fmtClock(new Date(murFocus.startAt)) + " (" + surah + qari + "). File ter-cache, tetap jalan saat WiFi putus."
        : "Murotal menunggu jadwal sholat.",
    };
    model.systemStatus.murotalStatus = soon ? "BERSIAP" : "SIAGA";
  }

  // Countdown hari besar.
  const cb = payload ? payload.countdown_berikutnya : null;
  if (cb) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = String(cb.tanggal).split("-");
    const evDate = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const days = Math.round((evDate.getTime() - today.getTime()) / 86400000);
    model.upcomingEvent = {
      eventName: cb.nama,
      daysRemaining: days <= 0 ? "Hari ini" : "H−" + days,
      eventDate: "Berlangsung " + fmtTanggalId(evDate) + ".",
    };
  }

  return model;
}
