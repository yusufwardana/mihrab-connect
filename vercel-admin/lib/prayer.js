// Perhitungan jadwal sholat metode Kemenag + tanggal Hijriyah.
// Murni fungsi matematika (tanpa dependensi) supaya bisa dipakai
// /api/jadwal dan /api/board, dan diuji tanpa Supabase.
//
// Parameter Kemenag (dokumen sumber + praktik umum Kemenag RI):
//   Subuh -20°, Isya -18°, Maghrib/Terbit matahari -0.833°,
//   Ashar faktor bayangan 1 (mazhab Syafi'i),
//   ihtiyat +2 menit untuk Subuh, Dzuhur, Ashar, Maghrib, Isya.
// Koreksi menit dari jadwal_settings diterapkan ke semua waktu.
// Zona waktu tetap WIB (UTC+7) — masjid pilot berada di Jawa.
//
// Akurasi: perhitungan posisi matahari standar (algoritme PrayTimes);
// selisih terhadap jadwal resmi Kemenag umumnya < 2 menit sebelum ihtiyat.
"use strict";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NAMA_BULAN_HIJRIYAH = [
  "Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jumadilawal", "Jumadilakhir",
  "Rajab", "Sya'ban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah",
];

// "Hari ini" dalam WIB, sebagai tanggal kalender (tahun, bulan 1-12, hari).
function hariIniWIB() {
  const kini = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return { tahun: kini.getUTCFullYear(), bulan: kini.getUTCMonth() + 1, hari: kini.getUTCDate() };
}

function formatTanggalId(t) {
  const d = new Date(Date.UTC(t.tahun, t.bulan - 1, t.hari));
  return (
    NAMA_HARI[d.getUTCDay()] + ", " + t.hari + " " + NAMA_BULAN[t.bulan - 1] + " " + t.tahun
  );
}

function fixAngle(a) {
  return a - 360 * Math.floor(a / 360);
}
function fixHour(h) {
  return h - 24 * Math.floor(h / 24);
}

function julianDay(tahun, bulan, hari) {
  let y = tahun;
  let m = bulan;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    hari +
    B -
    1524.5
  );
}

function posisiMatahari(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(
    q + 1.915 * Math.sin(g * D2R) + 0.02 * Math.sin(2 * g * D2R)
  );
  const e = 23.439 - 0.00000036 * D;
  const RA =
    Math.atan2(Math.cos(e * D2R) * Math.sin(L * D2R), Math.cos(L * D2R)) / D2R / 15;
  const decl = Math.asin(Math.sin(e * D2R) * Math.sin(L * D2R)) / D2R;
  const eqt = q / 15 - fixHour(RA);
  return { deklinasi: decl, equation: eqt };
}

// Jam saat matahari berada pada ketinggian `sudut` derajat.
// `tengahHari` = transit (siang). arah -1 = sebelum transit, +1 = sesudah.
function waktuSudut(sudut, lat, decl, tengahHari, arah) {
  const cosH =
    (Math.sin(sudut * D2R) - Math.sin(lat * D2R) * Math.sin(decl * D2R)) /
    (Math.cos(lat * D2R) * Math.cos(decl * D2R));
  if (cosH < -1 || cosH > 1) return null; // matahari tidak mencapai sudut itu
  const H = (Math.acos(Math.max(-1, Math.min(1, cosH))) * R2D) / 15;
  return tengahHari + arah * H;
}

function keJamMenit(jamDesimal) {
  const total = Math.round(fixHour(jamDesimal) * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

// Hitung jadwal sholat untuk satu tanggal (WIB) dari koordinat masjid.
// Mengembalikan null bila koordinat tidak tersedia.
// koreksiMenit: nilai tunggal dari jadwal_settings, diterapkan ke semua waktu.
function hitungJadwalSholat({ lat, lng, tanggal, koreksiMenit }) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  const tz = 7; // WIB
  const jd = julianDay(tanggal.tahun, tanggal.bulan, tanggal.hari);
  const { deklinasi, equation } = posisiMatahari(jd);
  const tengahHari = fixHour(12 + tz - lng / 15 - equation);
  const koreksi = Number(koreksiMenit) || 0;
  const IHTIYAT = 2 / 60; // +2 menit (jam desimal)

  const subuh = waktuSudut(-20, lat, deklinasi, tengahHari, -1);
  const terbit = waktuSudut(-0.833, lat, deklinasi, tengahHari, -1);
  const maghrib = waktuSudut(-0.833, lat, deklinasi, tengahHari, 1);
  const isya = waktuSudut(-18, lat, deklinasi, tengahHari, 1);
  // Ashar (Syafi'i): ketinggian saat bayangan = 1x bendanya.
  const selisih = Math.abs(lat - deklinasi);
  const sudutAshar = Math.atan(1 / (1 + Math.tan(selisih * D2R))) * R2D;
  const ashar = waktuSudut(sudutAshar, lat, deklinasi, tengahHari, 1);

  const jam = (v, ihtiyat) =>
    v === null ? null : keJamMenit(v + (ihtiyat ? IHTIYAT : 0) + koreksi / 60);

  return [
    { nama: "Subuh", jam: jam(subuh, true) },
    { nama: "Terbit", jam: jam(terbit, false) },
    { nama: "Dzuhur", jam: jam(tengahHari, true) },
    { nama: "Ashar", jam: jam(ashar, true) },
    { nama: "Maghrib", jam: jam(maghrib, true) },
    { nama: "Isya", jam: jam(isya, true) },
  ];
}

// ---- Tanggal Hijriyah (kalender tabular / algoritme Kuwaiti) ----
// Akurasi ±1 hari terhadap rukyat; offset_hijriyah dari pengaturan
// dipakai untuk menyesuaikan bila tanggal resmi setempat berbeda.
function gregorianKeHijriyah(tahun, bulan, hari) {
  // julianDay() mengembalikan JD tengah hari (… ,5); nomor hari Julian (JDN)
  // adalah floor(JD) + 1. Tanpa +1 ini tanggal Hijriyah mundur 1 hari.
  const jd = Math.floor(julianDay(tahun, bulan, hari)) + 1;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const bulanH = Math.floor((24 * l) / 709);
  const hariH = l - Math.floor((709 * bulanH) / 24);
  const tahunH = 30 * n + j - 30;
  return { hari: hariH, bulan: bulanH, tahun: tahunH };
}

function tanggalHijriyah(tanggal, offsetHari) {
  // Geser tanggal Masehi dulu, lalu konversi.
  const d = new Date(Date.UTC(tanggal.tahun, tanggal.bulan - 1, tanggal.hari));
  d.setUTCDate(d.getUTCDate() + (Number(offsetHari) || 0));
  const h = gregorianKeHijriyah(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return h.hari + " " + NAMA_BULAN_HIJRIYAH[h.bulan - 1] + " " + h.tahun + " H";
}

module.exports = { hariIniWIB, formatTanggalId, hitungJadwalSholat, tanggalHijriyah };
